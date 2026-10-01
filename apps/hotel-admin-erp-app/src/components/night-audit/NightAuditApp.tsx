import React, { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  ShieldCheck,
  Calendar,
  Bed,
  UtensilsCrossed,
  Receipt,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Play,
  History,
  FileSpreadsheet,
  Lock,
  RefreshCw,
} from 'lucide-react';
import {
  INightAuditSessionUI,
  IPreAuditDayStatusUI,
  NightAuditHelper,
  NightAuditStore,
} from '@spicehub/ui';

interface NightAuditAppProps {
  hotelId?: string;
  token?: string;
  apiUrl?: string;
}

export const NightAuditApp: React.FC<NightAuditAppProps> = ({
  hotelId = '',
  token,
  apiUrl = 'http://localhost:5000/api/v1',
}) => {
  const [store] = useState(() => new NightAuditStore());
  const [history, setHistory] = useState<INightAuditSessionUI[]>([]);
  const [preAuditStatus, setPreAuditStatus] = useState<IPreAuditDayStatusUI | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showRunModal, setShowRunModal] = useState<boolean>(false);
  const [isExecutingAudit, setIsExecutingAudit] = useState<boolean>(false);
  const [auditNotes, setAuditNotes] = useState<string>('Standard End-of-Day Business Rollover');
  const [selectedAuditReport, setSelectedAuditReport] = useState<INightAuditSessionUI | null>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setHistory([...store.getHistory()]);
      setPreAuditStatus(store.getPreAuditStatus());
    });
    fetchInitialData();
    return () => unsubscribe();
  }, [hotelId]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-hotel-id': hotelId,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Fetch pre-audit status
      const statusRes = await fetch(`${apiUrl}/night-audit/pre-audit-status`, { headers });
      const statusJson = await statusRes.json();
      if (statusJson.success && statusJson.data) {
        store.setPreAuditStatus(statusJson.data);
      }

      // Fetch audit history
      const historyRes = await fetch(`${apiUrl}/night-audit/history`, { headers });
      const historyJson = await historyRes.json();
      if (historyJson.success && Array.isArray(historyJson.data)) {
        store.setHistory(historyJson.data);
      }
    } catch (err) {
      console.error('Failed to load night audit data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAudit = async () => {
    setIsExecutingAudit(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-hotel-id': hotelId,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/night-audit/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          auditDate: preAuditStatus?.currentBusinessDate,
          notes: auditNotes,
          performedByUserName: 'Hotel Night Auditor',
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        store.addCompletedAudit(json.data);
        setShowRunModal(false);
        setSelectedAuditReport(json.data);
      } else {
        alert(json.message || 'Night audit execution failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error executing night audit');
    } finally {
      setIsExecutingAudit(false);
    }
  };

  const latestAudit = history[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Moon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Hotel Daily Night Audit & Revenue Engine</h1>
              <p className="text-sm text-slate-400">
                Authoritative midnight day-close, room revenue auto-posting & business date advance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <div>
              <div className="text-xs text-slate-400 font-medium">CURRENT BUSINESS DATE</div>
              <div className="text-sm font-semibold text-emerald-400">
                {preAuditStatus?.currentBusinessDate || 'Loading...'}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowRunModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Execute Night Audit</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Occupancy Rate */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Occupancy Rate</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {preAuditStatus ? `${preAuditStatus.occupancyRate}%` : '0%'}
          </div>
          <div className="text-xs text-slate-400">
            {preAuditStatus ? `${preAuditStatus.occupiedRooms} / ${preAuditStatus.totalRooms} Rooms Occupied` : '0 Rooms'}
          </div>
        </div>

        {/* Total Room Revenue */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Room Revenue</span>
            <Bed className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {latestAudit ? NightAuditHelper.formatCurrency(latestAudit.totalRoomRevenue) : '₹0'}
          </div>
          <div className="text-xs text-slate-400">Auto-posted to Master Folios</div>
        </div>

        {/* F&B Revenue */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">F&B Revenue</span>
            <UtensilsCrossed className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {latestAudit ? NightAuditHelper.formatCurrency(latestAudit.totalFoodAndBeverageRevenue) : '₹0'}
          </div>
          <div className="text-xs text-slate-400">Restaurant & In-Room Dining</div>
        </div>

        {/* ADR (Average Daily Rate) */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Daily Rate (ADR)</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {latestAudit ? NightAuditHelper.formatCurrency(latestAudit.averageDailyRate) : '₹0'}
          </div>
          <div className="text-xs text-slate-400">Rev / Occupied Room</div>
        </div>

        {/* RevPAR */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">RevPAR</span>
            <Receipt className="w-4 h-4 text-fuchsia-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {latestAudit ? NightAuditHelper.formatCurrency(latestAudit.revPAR) : '₹0'}
          </div>
          <div className="text-xs text-slate-400">Rev / Total Available Room</div>
        </div>
      </div>

      {/* Pre-Audit Readiness Status Checklist */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Pre-Audit System Readiness Checklist</span>
          </h2>
          <button
            onClick={fetchInitialData}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Status</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-slate-200 text-sm">Room Tariff Auto-Post Ready</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {preAuditStatus?.occupiedRooms || 0} In-House guests identified for automatic nightly room charges
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-slate-200 text-sm">Unposted Charges Sweeper</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {preAuditStatus?.unpostedOrdersCount || 0} active kitchen tickets will be safely rolled over
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-slate-200 text-sm">Financial Day-Close Lock</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Prevents backdated folio and POS tampering after midnight
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Night Audit Sessions Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-slate-200 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Audit History & Business Date Rollover Logs</span>
          </h2>
          <span className="text-xs text-slate-400">Showing {history.length} completed sessions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Audit Date</th>
                <th className="py-3.5 px-4 font-semibold">Rollover Date</th>
                <th className="py-3.5 px-4 font-semibold">Occupancy</th>
                <th className="py-3.5 px-4 font-semibold">Gross Revenue</th>
                <th className="py-3.5 px-4 font-semibold">ADR</th>
                <th className="py-3.5 px-4 font-semibold">RevPAR</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Auditor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No night audit sessions executed yet. Run your first audit using the button above.
                  </td>
                </tr>
              ) : (
                history.map((audit) => {
                  const badge = NightAuditHelper.getStatusBadge(audit.status);
                  return (
                    <tr
                      key={audit._id}
                      onClick={() => setSelectedAuditReport(audit)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium text-white">{audit.auditDate}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-medium">{audit.nextBusinessDate}</td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {audit.occupancyRate}% ({audit.occupiedRooms}/{audit.totalRooms})
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-100">
                        {NightAuditHelper.formatCurrency(audit.totalGrossRevenue)}
                      </td>
                      <td className="py-3.5 px-4 text-cyan-400">
                        {NightAuditHelper.formatCurrency(audit.averageDailyRate)}
                      </td>
                      <td className="py-3.5 px-4 text-fuchsia-400">
                        {NightAuditHelper.formatCurrency(audit.revPAR)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: badge.border,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{audit.performedByUserName || 'System Auto'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execute Night Audit Wizard Modal */}
      {showRunModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-6 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Moon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Execute Night Audit & Rollover</h3>
                <p className="text-xs text-slate-400">
                  Business Date: {preAuditStatus?.currentBusinessDate}
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>In-House Stays to Auto-Post:</span>
                <span className="font-semibold text-white">{preAuditStatus?.occupiedRooms || 0} Rooms</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Room Tax Rate:</span>
                <span className="font-semibold text-white">12% GST</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Next Business Date:</span>
                <span className="font-semibold text-emerald-400">
                  {preAuditStatus?.currentBusinessDate ? NightAuditHelper.formatCurrency(0) && 'Auto Next Day' : 'Next Day'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Audit Remarks / Log Notes</label>
              <textarea
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none h-20"
                placeholder="Enter audit notes..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRunModal(false)}
                disabled={isExecutingAudit}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAudit}
                disabled={isExecutingAudit}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 text-sm transition-all cursor-pointer"
              >
                {isExecutingAudit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Audit...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Roll Over Date</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
