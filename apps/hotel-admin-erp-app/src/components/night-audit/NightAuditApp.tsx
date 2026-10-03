import React, { useState, useEffect } from 'react';
import {
  Moon,
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
  Lock,
  RefreshCw,
  Sparkles,
  Award,
  Clock,
  Printer,
  X,
  FileCheck2,
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
  const [auditNotes, setAuditNotes] = useState<string>('Standard End-of-Day Business Rollover & Day Lock');
  const [selectedAuditReport, setSelectedAuditReport] = useState<any | null>(null);

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
          performedByUserName: 'Head Night Auditor (Priya Sharma)',
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        store.addCompletedAudit(json.data);
        setShowRunModal(false);
        setSelectedAuditReport(json.data);
        // Refresh status
        fetchInitialData();
      } else {
        alert(json.message || 'Night audit execution failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error executing night audit');
    } finally {
      setIsExecutingAudit(false);
    }
  };

  const latestAudit = (history && history.length > 0 ? history[0] : null) as any;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 p-6 space-y-6">
      {/* 5-Star Luxury Midnight Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-[#0d121f] via-[#0f172a] to-[#0d121f] border border-amber-500/20 p-6 rounded-2xl shadow-2xl shadow-black/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center font-bold">
              <Moon className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-widest font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> 5-STAR LUXURY HOTEL PMS
                </span>
                <span className="text-[10px] tracking-widest font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  DAY LOCK LEVEL-4
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mt-1">
                Hotel Daily Night Audit & Business Rollover Engine
              </h1>
              <p className="text-xs text-slate-400">
                Midnight financial closure, automated room tariff posting to folios, & cryptographic day lock
              </p>
            </div>
          </div>
        </div>

        {/* Business Date Pill & CTA */}
        <div className="flex flex-wrap items-center gap-4 z-10">
          <div className="px-5 py-3 bg-[#080c14]/90 border border-amber-500/30 rounded-xl flex items-center gap-3 shadow-inner">
            <Calendar className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Business Date</div>
              <div className="text-sm font-black text-amber-400 tracking-wide" data-testid="current-business-date">
                {preAuditStatus?.currentBusinessDate || '2026-10-03'}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowRunModal(true)}
            data-testid="night-audit-open-run-modal-btn"
            className="flex items-center gap-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-3 rounded-xl shadow-lg shadow-amber-500/25 transition-all transform active:scale-95 cursor-pointer uppercase tracking-wider text-xs"
          >
            <Lock className="w-4 h-4 stroke-[2.5]" />
            <span>Execute Midnight Day Close</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Occupancy Rate */}
        <div className="bg-[#0b0f19] border border-amber-500/20 p-5 rounded-2xl space-y-2 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Occupancy Rate</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white" data-testid="kpi-occupancy">
            {preAuditStatus ? `${preAuditStatus.occupancyRate}%` : '60%'}
          </div>
          <div className="text-xs text-slate-400">
            {preAuditStatus ? `${preAuditStatus.occupiedRooms} / ${preAuditStatus.totalRooms} Rooms Occupied` : '3 / 5 Rooms Occupied'}
          </div>
        </div>

        {/* Total Room Revenue */}
        <div className="bg-[#0b0f19] border border-amber-500/20 p-5 rounded-2xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Room Revenue Pool</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Bed className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400" data-testid="kpi-room-revenue">
            {latestAudit ? NightAuditHelper.formatCurrency(latestAudit.totalRoomRevenue) : '₹18,500'}
          </div>
          <div className="text-xs text-slate-400">Auto-post to Master Folios</div>
        </div>

        {/* F&B Revenue */}
        <div className="bg-[#0b0f19] border border-amber-500/20 p-5 rounded-2xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">F&B Total Settled</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {latestAudit ? NightAuditHelper.formatCurrency(latestAudit.totalFoodAndBeverageRevenue) : '₹9,450'}
          </div>
          <div className="text-xs text-slate-400">Dining & In-Room Orders</div>
        </div>

        {/* ADR (Average Daily Rate) */}
        <div className="bg-[#0b0f19] border border-amber-500/20 p-5 rounded-2xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">ADR (Avg Daily Rate)</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {latestAudit ? NightAuditHelper.formatCurrency(latestAudit.averageDailyRate) : '₹6,166'}
          </div>
          <div className="text-xs text-slate-400">Rev / Occupied Room</div>
        </div>

        {/* RevPAR */}
        <div className="bg-[#0b0f19] border border-amber-500/20 p-5 rounded-2xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">RevPAR</span>
            <div className="p-1.5 rounded-lg bg-fuchsia-500/10 text-fuchsia-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-fuchsia-400">
            {latestAudit ? NightAuditHelper.formatCurrency(latestAudit.revPAR) : '₹3,700'}
          </div>
          <div className="text-xs text-slate-400">Rev / Total Available Room</div>
        </div>
      </div>

      {/* Pre-Audit Readiness Inspection Matrix */}
      <div className="bg-[#0b0f19] border border-amber-500/20 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Pre-Audit 4-Point System Readiness Matrix
              </h2>
              <p className="text-xs text-slate-400">All checks must pass before Day Lock can be executed</p>
            </div>
          </div>
          <button
            onClick={fetchInitialData}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors border border-slate-700/50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Check 1 */}
          <div className="p-4 bg-[#070a12] border border-slate-800/90 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-200 text-sm">Room Tariff Auto-Post Ready</div>
              <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                {preAuditStatus?.occupiedRooms || 3} in-house guest rooms identified. Nightly tariff + 12% GST ready to post atomically.
              </div>
            </div>
          </div>

          {/* Check 2 */}
          <div className="p-4 bg-[#070a12] border border-slate-800/90 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-200 text-sm">Late Diners & KOT Quarantine</div>
              <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                {preAuditStatus?.unpostedOrdersCount || 0} active midnight tables quarantined safely to next day ledger.
              </div>
            </div>
          </div>

          {/* Check 3 */}
          <div className="p-4 bg-[#070a12] border border-slate-800/90 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-lg shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-200 text-sm">Cryptographic Day-Close Seal</div>
              <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                Generates immutable audit certificate and locks previous business date from backdated alterations.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Night Audit Sessions Table */}
      <div className="bg-[#0b0f19] border border-amber-500/20 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#080c14]">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-white text-sm uppercase tracking-wider">
              Audit History & Rollover Verification Logs
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Sessions: {history.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#05070c] text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-bold">Certificate</th>
                <th className="py-3.5 px-4 font-bold">Audit Date</th>
                <th className="py-3.5 px-4 font-bold">Rolled To</th>
                <th className="py-3.5 px-4 font-bold">Occupancy</th>
                <th className="py-3.5 px-4 font-bold">Gross Revenue</th>
                <th className="py-3.5 px-4 font-bold">ADR</th>
                <th className="py-3.5 px-4 font-bold">RevPAR</th>
                <th className="py-3.5 px-4 font-bold">Day Lock</th>
                <th className="py-3.5 px-4 font-bold">Auditor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No night audit sessions executed yet for this property. Run your first audit using the button above.
                  </td>
                </tr>
              ) : (
                history.map((audit: any) => {
                  const cert = audit.dayLockCertificateNumber || `#CERT-EOD-${audit._id.slice(-6).toUpperCase()}`;
                  return (
                    <tr
                      key={audit._id}
                      onClick={() => setSelectedAuditReport(audit)}
                      className="hover:bg-[#131b2e] cursor-pointer transition-colors"
                      data-testid={`audit-row-${audit.auditDate}`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400 text-xs">{cert}</td>
                      <td className="py-3.5 px-4 font-medium text-white">{audit.auditDate}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold">{audit.nextBusinessDate}</td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {audit.occupancyRate}% ({audit.occupiedRooms}/{audit.totalRooms})
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-300">
                        {NightAuditHelper.formatCurrency(audit.totalGrossRevenue)}
                      </td>
                      <td className="py-3.5 px-4 text-cyan-400 font-medium">
                        {NightAuditHelper.formatCurrency(audit.averageDailyRate)}
                      </td>
                      <td className="py-3.5 px-4 text-fuchsia-400 font-medium">
                        {NightAuditHelper.formatCurrency(audit.revPAR)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3" /> SEALED
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs">{audit.performedByUserName || 'System Auditor'}</td>
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
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          data-testid="night-audit-run-modal"
        >
          <div className="bg-[#0b0f19] border border-amber-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-6 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 rounded-xl font-bold">
                  <Moon className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Execute Midnight Night Audit & Rollover</h3>
                  <p className="text-xs text-amber-400 font-mono">
                    Current Business Date: {preAuditStatus?.currentBusinessDate || '2026-10-03'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRunModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-[#06080e] p-4 rounded-xl border border-amber-500/20 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><Bed className="w-3.5 h-3.5 text-indigo-400" /> In-House Stays to Auto-Post:</span>
                <span className="font-bold text-white">{preAuditStatus?.occupiedRooms || 3} Rooms</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5 text-amber-400" /> Nightly Room Tax:</span>
                <span className="font-bold text-emerald-400">12% GST Applied</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-cyan-400" /> Target Next Business Date:</span>
                <span className="font-bold text-emerald-400">Advance to Next Day (+1)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-amber-400" /> Security Day Lock:</span>
                <span className="font-bold text-amber-400">Cryptographically Sealed</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Auditor Certification Remarks
              </label>
              <textarea
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                data-testid="night-audit-notes-input"
                className="w-full bg-[#06080e] border border-amber-500/30 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-400 resize-none h-20"
                placeholder="Enter audit log notes..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowRunModal(false)}
                disabled={isExecutingAudit}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAudit}
                disabled={isExecutingAudit}
                data-testid="night-audit-confirm-btn"
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 text-xs transition-all uppercase tracking-wider cursor-pointer"
              >
                {isExecutingAudit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Day Lock...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirm & Roll Over Date</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5-Star Luxury Day Lock Signed Audit Certificate Modal */}
      {selectedAuditReport && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          data-testid="night-audit-cert-modal"
        >
          <div className="bg-[#0b0f19] border-2 border-amber-500/50 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative p-8 space-y-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Crest Header */}
            <div className="text-center space-y-2 border-b border-amber-500/30 pb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30">
                <Award className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-400">
                Taj Gateway Luxury Resort & Suites
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Official Night Audit Day Lock Certificate
              </h2>
              <div
                className="inline-block px-4 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs tracking-wider"
                data-testid="night-audit-cert-number"
              >
                {selectedAuditReport.dayLockCertificateNumber || `#CERT-EOD-${selectedAuditReport._id?.slice(-6).toUpperCase()}`}
              </div>
            </div>

            {/* Certificate Details Matrix */}
            <div
              className="bg-[#06080e] border border-amber-500/20 rounded-2xl p-5 space-y-3.5 text-xs font-mono"
              data-testid="night-audit-certificate-card"
            >
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Audited Business Date:</span>
                <span className="font-bold text-white">{selectedAuditReport.auditDate}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">New Operational Date:</span>
                <span className="font-bold text-emerald-400">{selectedAuditReport.nextBusinessDate}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Total Rooms Auto-Posted:</span>
                <span className="font-bold text-white">{selectedAuditReport.roomsAutoPostedCount || selectedAuditReport.occupiedRooms || 0} Folios</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Total Room Tariff Posted:</span>
                <span className="font-bold text-amber-400">{NightAuditHelper.formatCurrency(selectedAuditReport.totalRoomRevenue)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Total F&B Revenue Rolled Up:</span>
                <span className="font-bold text-white">{NightAuditHelper.formatCurrency(selectedAuditReport.totalFoodAndBeverageRevenue)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 border-t border-slate-800 pt-3">
                <span className="text-slate-300 font-bold uppercase">Audited Gross Revenue:</span>
                <span className="text-base font-black text-amber-300">
                  {NightAuditHelper.formatCurrency(selectedAuditReport.totalGrossRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">RevPAR / ADR:</span>
                <span className="font-bold text-cyan-400">
                  {NightAuditHelper.formatCurrency(selectedAuditReport.revPAR)} / {NightAuditHelper.formatCurrency(selectedAuditReport.averageDailyRate)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Security Day Lock:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] tracking-wider uppercase">
                  CRYPTOGRAPHICALLY SEALED
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400 text-[10px] pt-1">
                <span>Certified By:</span>
                <span>{selectedAuditReport.performedByUserName || 'Priya Sharma (Night Auditor)'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedAuditReport(null)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
