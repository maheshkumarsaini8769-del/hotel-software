import React from 'react';
import {
  HelpCircle,
  FileText,
  Phone,
  Wifi,
  Printer,
  ShieldCheck,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

interface HelpAndSupportViewProps {
  isDark: boolean;
  triggerToast: (msg: string) => void;
}

export const HelpAndSupportView: React.FC<HelpAndSupportViewProps> = ({
  isDark,
  triggerToast,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-5 gap-4">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-[#121520] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Waiter Handbook, SOPs & Floor Support
            </h2>
            <p className="text-xs text-slate-400">
              Operational standard procedures, emergency floor hotlines, and diagnostics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
            isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Support Desk Available
          </span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
        {/* SOP Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-5 rounded-2xl border space-y-2 ${
            isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>SOP #1: 60-Second Food Pickup SLA</span>
            </div>
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Hot Food Table Delivery Rule
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              When the kitchen hot pass rings the bell and food is marked 'Ready', the waiter has exactly 60 seconds to pick up the tray and serve it to the dining table. If delayed, snooze by 60s to notify the chef.
            </p>
          </div>

          <div className={`p-5 rounded-2xl border space-y-2 ${
            isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>SOP #2: Dynamic UPI QR Billing</span>
            </div>
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Guest Bill Splitting Protocol
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Guests can split bills equally or per dish. Open the 'Split Bill' or 'Table Billing' workstation to generate unique UPI QR codes for each party. Payment confirmations trigger real-time soundbox notifications.
            </p>
          </div>

          <div className={`p-5 rounded-2xl border space-y-2 ${
            isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>SOP #3: Table Transfer & Merging</span>
            </div>
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Preserving Active Running Orders
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              When moving seated guests to an alternate table, use the 'Table Transfer' console. This automatically preserves running KOT items and shifts the open billing folio to the new table without billing duplicates.
            </p>
          </div>

          <div className={`p-5 rounded-2xl border space-y-2 ${
            isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>SOP #4: Allergen & Special Notes</span>
            </div>
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Zero Contamination Policy
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Always use the 'Call Kitchen' intercom buzzer to notify the Executive Chef pass whenever a dining party mentions peanut, dairy, or gluten allergies before firing the main order ticket.
            </p>
          </div>
        </div>

        {/* Hotlines & Diagnostics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Emergency Hotlines */}
          <div className={`p-5 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <h3 className={`font-black text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Phone className="w-4 h-4 text-orange-500" />
              <span>Floor Emergency Contacts</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                isDark ? 'border-slate-700/30 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Restaurant Floor Manager</span>
                <span className={`font-mono font-black ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>Ext. #101</span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                isDark ? 'border-slate-700/30 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Executive Chef Hot Pass</span>
                <span className={`font-mono font-black ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>Ext. #102</span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                isDark ? 'border-slate-700/30 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Cashier POS Desk</span>
                <span className={`font-mono font-black ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>Ext. #104</span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                isDark ? 'border-slate-700/30 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Reception Front Desk</span>
                <span className={`font-mono font-black ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>Ext. #105</span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                isDark ? 'border-slate-700/30 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>IT / Software POS Support</span>
                <span className={`font-mono font-black ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>Ext. #108</span>
              </div>
            </div>
          </div>

          {/* System Diagnostics */}
          <div className={`p-5 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <h3 className={`font-black text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>System Health & Diagnostics</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                isDark ? 'border-slate-700/30 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>POS Backend API</span>
                </div>
                <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Online (14ms)</span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                isDark ? 'border-slate-700/30 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Kitchen KDS WebSocket</span>
                </div>
                <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Connected</span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                isDark ? 'border-slate-700/30 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Soundbox Voice Alert</span>
                </div>
                <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Armed</span>
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                isDark ? 'border-slate-700/30 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Thermal Network Printer</span>
                </div>
                <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Ready (192.168.1.150)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
