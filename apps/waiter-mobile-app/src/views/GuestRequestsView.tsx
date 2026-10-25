import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Plus,
  AlertCircle,
  Bell,
  Coffee,
  Sparkles
} from 'lucide-react';

interface GuestRequest {
  id: string;
  table: string;
  timeAgo: string;
  request: string;
}

interface GuestRequestsViewProps {
  isDark: boolean;
  requests: GuestRequest[];
  onCompleteRequest: (id: string, table: string, request: string) => void;
  triggerToast: (msg: string) => void;
}

export const GuestRequestsView: React.FC<GuestRequestsViewProps> = ({
  isDark,
  requests,
  onCompleteRequest,
  triggerToast,
}) => {
  const [newTable, setNewTable] = useState('Table 4');
  const [newRequestType, setNewRequestType] = useState('Extra Water');

  const handleCreateManualRequest = () => {
    triggerToast(`Logged new assistance request "${newRequestType}" for ${newTable}!`);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4">
      {/* Header */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-[#121520] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Guest Assistance & Service Requests
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-purple-500 text-white">
                {requests.length} Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live customer bell rings, water refills, cutlery, and bill requests
            </p>
          </div>
        </div>

        {/* Quick Log Form */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={newTable}
            onChange={(e) => setNewTable(e.target.value)}
            className={`p-2 rounded-xl border text-xs font-bold focus:outline-none ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16].map((n) => (
              <option key={n} value={`Table ${n}`}>Table {n}</option>
            ))}
          </select>

          <select
            value={newRequestType}
            onChange={(e) => setNewRequestType(e.target.value)}
            className={`p-2 rounded-xl border text-xs font-bold focus:outline-none ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="Extra Water">Extra Water</option>
            <option value="Tissue Paper">Tissue Paper</option>
            <option value="Call Waiter (Menu Advice)">Call Waiter (Menu Advice)</option>
            <option value="Clean / Wipe Table">Clean / Wipe Table</option>
            <option value="Fresh Cutlery & Spoons">Fresh Cutlery & Spoons</option>
            <option value="Bill Request">Bill Request</option>
          </select>

          <button
            onClick={handleCreateManualRequest}
            className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Log Request</span>
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-24 lg:pb-6">
        {requests.length === 0 ? (
          <div className={`h-64 flex flex-col items-center justify-center rounded-2xl border text-center p-6 ${
            isDark ? 'bg-[#121520] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-2xs'
          }`}>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2 opacity-80" />
            <h3 className="font-bold text-sm">All Guest Requests Completed!</h3>
            <p className="text-xs mt-1">There are currently no outstanding table assistance alerts on your shift.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all hover:shadow-lg ${
                  isDark ? 'bg-[#181c2b] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div>
                  <div className={`flex items-center justify-between pb-2 border-b ${
                    isDark ? 'border-slate-700/30' : 'border-slate-200'
                  }`}>
                    <span className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {req.table}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 border border-purple-300 text-purple-800'
                    }`}>
                      HIGH PRIORITY
                    </span>
                  </div>

                  <div className={`flex items-center gap-1.5 text-xs py-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                    <span>Requested {req.timeAgo}</span>
                  </div>

                  <div className={`p-3 rounded-xl border my-1 text-sm font-bold ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-100' : 'bg-purple-50/80 border-purple-200 text-purple-950'
                  }`}>
                    {req.request}
                  </div>
                </div>

                <div className={`grid grid-cols-2 gap-2 pt-2 border-t ${isDark ? 'border-slate-700/20' : 'border-slate-200'}`}>
                  <button
                    onClick={() => onCompleteRequest(req.id, req.table, req.request)}
                    className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Done</span>
                  </button>
                  <button
                    onClick={() => triggerToast(`Guest at ${req.table} notified: "Waiter is on the way!"`)}
                    className={`py-2 rounded-xl font-bold text-xs border flex items-center justify-center gap-1 transition ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5 text-purple-500" />
                    <span>On My Way</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
