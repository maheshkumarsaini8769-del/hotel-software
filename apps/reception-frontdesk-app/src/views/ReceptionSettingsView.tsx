import React, { useState } from 'react';
import {
  Settings,
  Clock,
  Building,
  ShieldCheck,
  CheckCircle2,
  Save,
  KeyRound,
  FileText,
  Sliders
} from 'lucide-react';

interface ReceptionSettingsViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
}

const SETTINGS_KEY = 'spicehub_reception_settings';

function readSetting(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed[key] ?? fallback;
  } catch {
    return fallback;
  }
}

export const ReceptionSettingsView: React.FC<ReceptionSettingsViewProps> = ({ isDark = true, onToast }) => {
  const [checkInTime, setCheckInTime] = useState(() => readSetting('checkInTime', '12:00'));
  const [checkOutTime, setCheckOutTime] = useState(() => readSetting('checkOutTime', '11:00'));
  const [gracePeriod, setGracePeriod] = useState(() => readSetting('gracePeriod', '60'));
  const [advanceDeposit, setAdvanceDeposit] = useState(() => readSetting('advanceDeposit', '50'));
  const [encoderPort, setEncoderPort] = useState(() => readSetting('encoderPort', 'COM3'));
  const [gstin, setGstin] = useState(() => readSetting('gstin', ''));
  const [hotelPhone, setHotelPhone] = useState(() => readSetting('hotelPhone', ''));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          checkInTime,
          checkOutTime,
          gracePeriod,
          advanceDeposit,
          encoderPort,
          gstin,
          hotelPhone,
        })
      );
    }
    if (onToast) onToast('Front desk settings saved on this terminal.');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Settings className="w-5 h-5 text-blue-500" />
            <span>Front Desk & Hotel Operational Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure this terminal's check-in/out schedules, late check-out policy, keycard encoder and legal details.
            These preferences are stored locally on this browser profile.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Section 1: Check-in & Departure Policies */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className="font-black text-sm text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Check-in & Departure Timings</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Standard Check-In Time</label>
              <input
                type="time"
                value={checkInTime}
                onChange={e => setCheckInTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Standard Check-Out Time</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={e => setCheckOutTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Grace Period (Minutes)</label>
              <input
                type="number"
                value={gracePeriod}
                onChange={e => setGracePeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Keycard & Hardware Integration */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className="font-black text-sm text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-500" />
            <span>Keycard Encoder & Front Desk Hardware</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">RFID Door Lock Encoder Port</label>
              <select
                value={encoderPort}
                onChange={e => setEncoderPort(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono"
              >
                <option value="COM1">COM1 (Standard Serial)</option>
                <option value="COM3">COM3 (USB Emulation Encoder)</option>
                <option value="TCP_IP">TCP/IP Network (192.168.1.150:8000)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Advance Deposit Requirement (%)</label>
              <input
                type="number"
                value={advanceDeposit}
                onChange={e => setAdvanceDeposit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Legal & Hotel Tax Info */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#141620] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h3 className="font-black text-sm text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-500" />
            <span>Hotel Profile & Government GSTIN</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Hotel GSTIN Number</label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Front Desk Direct Helpline</label>
              <input
                type="text"
                value={hotelPhone}
                onChange={e => setHotelPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-900 border-slate-800 text-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
