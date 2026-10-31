import React, { useState } from 'react';
import {
  Settings,
  Printer,
  Sliders,
  CheckCircle2,
  Save,
  Building2,
  FileText
} from 'lucide-react';

interface CashierSettingsViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
}

const SETTINGS_KEY = 'spicehub_cashier_settings';

function readSetting<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return (parsed[key] as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export const CashierSettingsView: React.FC<CashierSettingsViewProps> = ({ isDark = true, onToast }) => {
  const [printerWidth, setPrinterWidth] = useState(() => readSetting('printerWidth', '80mm'));
  const [autoKotPrint, setAutoKotPrint] = useState(() => readSetting('autoKotPrint', true));
  const [roundOff, setRoundOff] = useState(() => readSetting('roundOff', true));
  const [invoicePrefix, setInvoicePrefix] = useState(() => readSetting('invoicePrefix', 'TAX-2026-'));
  const [cgstPercent, setCgstPercent] = useState(() => readSetting('cgstPercent', '2.5'));
  const [sgstPercent, setSgstPercent] = useState(() => readSetting('sgstPercent', '2.5'));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          printerWidth,
          autoKotPrint,
          roundOff,
          invoicePrefix,
          cgstPercent,
          sgstPercent,
        })
      );
    }
    if (onToast) onToast('Cashier terminal preferences saved on this browser.');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Settings className="w-5 h-5 text-amber-500" />
            <span>POS & Cashier Hardware Configuration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure this terminal's thermal receipt printer, KOT print preference and rounding. Tax rates are
            calculated by the hotel tax engine; the values below are display preferences stored on this browser.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Printer & Hardware */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className="font-black text-sm text-white flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-500" />
            <span>Thermal Receipt Printer Setup</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Receipt Paper Roll Width</label>
              <select
                value={printerWidth}
                onChange={e => setPrinterWidth(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono"
              >
                <option value="80mm">80mm (Standard Desktop Thermal)</option>
                <option value="58mm">58mm (Handheld Mobile Thermal)</option>
                <option value="A4">A4 Full Sheet (Laser Printer)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Invoice Number Prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={e => setInvoicePrefix(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoKot"
                checked={autoKotPrint}
                onChange={e => setAutoKotPrint(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-0"
              />
              <label htmlFor="autoKot" className="text-xs text-slate-300 font-medium cursor-pointer">
                Auto-print kitchen KOT slips on order fire
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="roundOffCheck"
                checked={roundOff}
                onChange={e => setRoundOff(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-0"
              />
              <label htmlFor="roundOffCheck" className="text-xs text-slate-300 font-medium cursor-pointer">
                Automatically round off bill total to nearest whole rupee (₹)
              </label>
            </div>
          </div>
        </div>

        {/* Tax Slab Configuration */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className="font-black text-sm text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-500" />
            <span>F&B Tax Slabs (Restaurant GST)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">CGST Rate (%)</label>
              <input
                type="number"
                value={cgstPercent}
                onChange={e => setCgstPercent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">SGST Rate (%)</label>
              <input
                type="number"
                value={sgstPercent}
                onChange={e => setSgstPercent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-lg transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save POS Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
