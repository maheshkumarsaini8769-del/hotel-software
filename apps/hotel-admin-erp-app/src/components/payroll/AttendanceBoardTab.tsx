import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Sliders,
  Zap,
} from 'lucide-react';
import { apiFetch } from '../../config/api';
import {
  PayrollStaff,
  PortalRuleKey,
  ResolvedStaffDeduction,
  formatInr,
  getAttendanceBadgeClasses,
  getAttendanceSourceLabel,
  getPortalShortLabel,
  normalizeDisplayStatus,
} from './payrollTypes';

export interface AttendanceBoardRecord {
  id?: string;
  staffId?: string;
  name: string;
  role: string;
  portalKey: PortalRuleKey;
  baseSalary: number;
  salaryCycle?: string;
  status?: string;
  attendanceStatus?: string;
  attendanceSource?: string | null;
  source?: string | null;
  clockInTime?: string | null;
  deductionAmount?: number;
  dayDeductionAmount?: number;
  notes?: string;
  monthStats?: {
    presentDays: number;
    absentDays: number;
    halfDays: number;
    leaveDays: number;
  };
  attendanceStats?: {
    presentDays: number;
    absentDays: number;
    halfDays: number;
    leaveDays: number;
  };
  resolvedDeductionPolicy?: ResolvedStaffDeduction;
}

interface AttendanceBoardTabProps {
  hotelId: string;
  todayDateKey: string;
  staffList: PayrollStaff[];
  onRefreshAll: () => Promise<void> | void;
  onEditStaffRule: (staff: PayrollStaff) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export const AttendanceBoardTab: React.FC<AttendanceBoardTabProps> = ({
  hotelId,
  todayDateKey,
  staffList,
  onRefreshAll,
  onEditStaffRule,
  onNotify,
}) => {
  const [selectedDate, setSelectedDate] = useState(todayDateKey || new Date().toISOString().slice(0, 10));
  const [portalFilter, setPortalFilter] = useState<'ALL' | PortalRuleKey>('ALL');
  const [records, setRecords] = useState<AttendanceBoardRecord[]>([]);
  const [boardSummary, setBoardSummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    halfDay: 0,
    paidLeave: 0,
    unmarked: 0,
    totalDayDeductions: 0,
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [markingStaffId, setMarkingStaffId] = useState<string | null>(null);

  useEffect(() => {
    if (todayDateKey && !selectedDate) {
      setSelectedDate(todayDateKey);
    }
  }, [todayDateKey, selectedDate]);

  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (hotelId) params.set('hotelId', hotelId);
      if (selectedDate) params.set('date', selectedDate);
      if (portalFilter !== 'ALL') params.set('portal', portalFilter);

      const res = await apiFetch(`/payroll/attendance?${params.toString()}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to load attendance board');
      }
      setRecords(Array.isArray(json.records) ? json.records : []);
      if (json.summary) {
        setBoardSummary({
          total: Number(json.summary.total || 0),
          present: Number(json.summary.present || 0),
          absent: Number(json.summary.absent || 0),
          halfDay: Number(json.summary.halfDay || 0),
          paidLeave: Number(json.summary.paidLeave || 0),
          unmarked: Number(json.summary.unmarked || 0),
          totalDayDeductions: Number(json.summary.totalDayDeductions || 0),
        });
      }
    } catch (err: any) {
      onNotify(err?.message || 'Unable to load attendance board', 'error');
    } finally {
      setLoading(false);
    }
  }, [hotelId, selectedDate, portalFilter, onNotify]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const handleMarkStatus = async (
    record: AttendanceBoardRecord,
    status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'PAID_LEAVE'
  ) => {
    const sid = record.staffId || record.id || '';
    if (!sid) return;
    try {
      setMarkingStaffId(sid);
      const res = await apiFetch('/payroll/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({
          hotelId,
          staffId: sid,
          date: selectedDate,
          status,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to mark attendance');
      }
      await Promise.all([fetchBoard(), Promise.resolve(onRefreshAll())]);
      onNotify(json.message || `${record.name} marked ${status.replace('_', ' ')}`, 'success');
    } catch (err: any) {
      onNotify(err?.message || 'Unable to mark attendance', 'error');
    } finally {
      setMarkingStaffId(null);
    }
  };

  const handleAutoSync = async () => {
    try {
      setSyncing(true);
      const res = await apiFetch('/payroll/attendance/auto-sync', {
        method: 'POST',
        body: JSON.stringify({ hotelId, date: selectedDate }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Auto-attendance sync failed');
      }
      await Promise.all([fetchBoard(), Promise.resolve(onRefreshAll())]);
      onNotify(
        json.message || `Auto-attendance evaluated for ${selectedDate}.`,
        'success'
      );
    } catch (err: any) {
      onNotify(err?.message || 'Unable to sync auto-attendance', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Control Bar */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <label className="text-xs font-semibold text-slate-700">Attendance Date:</label>
            <input
              type="date"
              data-testid="attendance-date-picker"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'waiter', 'kds', 'cashier', 'reception', 'admin'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPortalFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  portalFilter === key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {key === 'ALL' ? 'All Portals' : getPortalShortLabel(key)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchBoard}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            data-testid="run-auto-sync-btn"
            onClick={handleAutoSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm disabled:opacity-60 transition"
          >
            <Zap className={`w-3.5 h-3.5 ${syncing ? 'animate-pulse' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Auto-Absent Now'}</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Staff', value: boardSummary.total, cls: 'text-slate-900' },
          { label: 'Present', value: boardSummary.present, cls: 'text-emerald-700' },
          { label: 'Absent', value: boardSummary.absent, cls: 'text-rose-700' },
          { label: 'Half-Day', value: boardSummary.halfDay, cls: 'text-amber-700' },
          { label: 'Paid Leave', value: boardSummary.paidLeave, cls: 'text-blue-700' },
          { label: 'Unmarked', value: boardSummary.unmarked, cls: 'text-slate-600' },
          { label: 'Day Deductions', value: formatInr(boardSummary.totalDayDeductions), cls: 'text-rose-700' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {kpi.label}
            </div>
            <div className={`text-xl font-bold mt-1 ${kpi.cls}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Staff Member</th>
                <th className="py-3.5 px-4">Detection / Punch</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Day Deduction</th>
                <th className="py-3.5 px-4 text-right">Per-Day Rule</th>
                <th className="py-3.5 px-5 text-right">Mark Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {records.map((rec) => {
                const sid = rec.staffId || rec.id || '';
                const rawStatus = rec.attendanceStatus ?? rec.status;
                const badge = getAttendanceBadgeClasses(rawStatus);
                const normalized = normalizeDisplayStatus(rawStatus);
                const sourceText = getAttendanceSourceLabel(rec.attendanceSource ?? rec.source);
                const deductionAmt = Number(rec.deductionAmount ?? rec.dayDeductionAmount ?? 0);
                const isBusy = markingStaffId === sid;
                const matchingStaff = staffList.find((s) => s.id === sid);
                const resolved = rec.resolvedDeductionPolicy || matchingStaff?.resolvedDeductionPolicy;

                return (
                  <tr key={sid || rec.name} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900">{rec.name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <span>{rec.role}</span>
                        <span>·</span>
                        <span className="font-medium text-slate-600">{getPortalShortLabel(rec.portalKey)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs font-semibold text-slate-800">{sourceText}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {rec.clockInTime
                          ? new Date(rec.clockInTime).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'No clock-in'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        data-testid={`attendance-status-${sid}`}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {deductionAmt > 0 ? (
                        <span className="text-rose-700">-{formatInr(deductionAmt)}</span>
                      ) : (
                        <span className="text-slate-400 font-medium">₹0</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {matchingStaff ? (
                        <button
                          type="button"
                          onClick={() => onEditStaffRule(matchingStaff)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-xs font-semibold text-slate-700 transition"
                        >
                          <Sliders className="w-3 h-3 text-blue-600" />
                          <span>
                            {resolved?.deductOnAbsent && resolved.effectivePerDayAmount > 0
                              ? `${formatInr(resolved.effectivePerDayAmount)}/day`
                              : 'No Cut'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {resolved?.deductOnAbsent && resolved.effectivePerDayAmount > 0
                            ? `${formatInr(resolved.effectivePerDayAmount)}/day`
                            : 'No Cut'}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          disabled={isBusy}
                          data-testid={`mark-present-${sid}`}
                          onClick={() => handleMarkStatus(rec, 'PRESENT')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            normalized === 'PRESENT'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Present</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          data-testid={`mark-halfday-${sid}`}
                          onClick={() => handleMarkStatus(rec, 'HALF_DAY')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            normalized === 'HALF_DAY'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          Half
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          data-testid={`mark-absent-${sid}`}
                          onClick={() => handleMarkStatus(rec, 'ABSENT')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            normalized === 'ABSENT'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Absent</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          data-testid={`mark-leave-${sid}`}
                          onClick={() => handleMarkStatus(rec, 'PAID_LEAVE')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            normalized === 'PAID_LEAVE'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          Leave
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    No active staff members found for this portal filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
