import React, { useState } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Volume2,
  Printer,
  Smartphone,
  Globe,
  CheckCircle2,
  Sliders
} from 'lucide-react';

interface SettingsViewProps {
  isDark: boolean;
  onToggleTheme: () => void;
  triggerToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isDark,
  onToggleTheme,
  triggerToast,
}) => {
  const [audioChime, setAudioChime] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [printerSize, setPrinterSize] = useState<'58mm' | '80mm'>('80mm');
  const [autoPrintKot, setAutoPrintKot] = useState(true);
  const [language, setLanguage] = useState('English');

  const handleSave = () => {
    triggerToast('Waiter Terminal preferences successfully saved!');
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-5 gap-4">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-[#121520] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Terminal Preferences & Configuration
            </h2>
            <p className="text-xs text-slate-400">
              Audio alarms, thermal printing parameters, and display mode settings
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Save Preferences</span>
        </button>
      </div>

      {/* Settings Grid */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
        {/* Section 1: Display & Theme */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`font-black text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <span>Display & Visual Theme</span>
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <div className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Appearance Mode
              </div>
              <div className="text-xs text-slate-400">
                Switch between high-contrast Dark theme and Bright Light theme
              </div>
            </div>

            <button
              onClick={onToggleTheme}
              className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
              <span>{isDark ? 'Current: Dark Mode (Click for Light)' : 'Current: Light Mode (Click for Dark)'}</span>
            </button>
          </div>
        </div>

        {/* Section 2: Audio & Alerts */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`font-black text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Volume2 className="w-4 h-4 text-orange-500" />
            <span>Audio & Sound Feedback</span>
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  60-Second Food Pickup SLA Alarm
                </div>
                <div className="text-xs text-slate-400">
                  Play urgent audio chimes when hot food is plated at kitchen pass
                </div>
              </div>
              <input
                type="checkbox"
                checked={audioChime}
                onChange={(e) => setAudioChime(e.target.checked)}
                className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3 border-slate-700/20">
              <div>
                <div className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Haptic Vibration on Mobile
                </div>
                <div className="text-xs text-slate-400">
                  Vibrate handheld device when a guest calls or food is ready
                </div>
              </div>
              <input
                type="checkbox"
                checked={vibration}
                onChange={(e) => setVibration(e.target.checked)}
                className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Thermal Printer */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`font-black text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Printer className="w-4 h-4 text-orange-500" />
            <span>Thermal Receipt & KOT Printer</span>
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Thermal Paper Width
                </div>
                <div className="text-xs text-slate-400">
                  Choose standard 58mm compact receipt or 80mm wide restaurant format
                </div>
              </div>
              <div className="flex gap-2">
                {(['58mm', '80mm'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setPrinterSize(sz)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      printerSize === sz
                        ? 'bg-orange-500 text-white shadow-sm'
                        : isDark
                        ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3 border-slate-700/20">
              <div>
                <div className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Auto-Print KOT Slip on Firing
                </div>
                <div className="text-xs text-slate-400">
                  Send copy to physical Bluetooth/Network printer immediately
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoPrintKot}
                onChange={(e) => setAutoPrintKot(e.target.checked)}
                className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Language */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`font-black text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Globe className="w-4 h-4 text-orange-500" />
            <span>Language & Region</span>
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <div className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Interface Language
              </div>
              <div className="text-xs text-slate-400">
                Select waiter interface and kitchen dish translation
              </div>
            </div>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`p-2 rounded-xl border text-xs font-bold focus:outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              <option value="English">English (Default)</option>
              <option value="Hindi">Hindi (हिंदी)</option>
              <option value="Hinglish">Hinglish</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
