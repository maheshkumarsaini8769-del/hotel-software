import React, { useEffect, useMemo, useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  RefreshCw,
  Edit2,
} from 'lucide-react';
import { NumericInput } from '@spicehub/ui';
import { apiFetch } from '../../config/api';
import {
  DeductionMode,
  NormalizedPayrollPolicy,
  PORTAL_RULE_META,
  PayrollStaff,
  PortalRuleKey,
  formatInr,
  getPortalShortLabel,
} from './payrollTypes';

interface PayrollPolicyTabProps {
  hotelId: string;
  policy: NormalizedPayrollPolicy;
  enabledPortals: string[];
  staffList: PayrollStaff[];
  onPolicySaved: (updated: NormalizedPayrollPolicy, message: string) => void;
  onEditStaffRule: (staff: PayrollStaff) => void;
  onError: (message: string) => void;
}

export const PayrollPolicyTab: React.FC<PayrollPolicyTabProps> = ({
  hotelId,
  policy,
  enabledPortals,
  staffList,
  onPolicySaved,
  onEditStaffRule,
  onError,
}) => {
  const [draft, setDraft] = useState<NormalizedPayrollPolicy>(policy);
  const [saving, setSaving] = useState(false);
  const [portalFilter, setPortalFilter] = useState<'ALL' | PortalRuleKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setDraft(policy);
  }, [policy]);

  const updatePortalRule = (
    key: PortalRuleKey,
    patch: Partial<NormalizedPayrollPolicy['portalDeductionRules'][PortalRuleKey]>
  ) => {
    setDraft((prev) => ({
      ...prev,
      portalDeductionRules: {
        ...prev.portalDeductionRules,
        [key]: {
          ...prev.portalDeductionRules[key],
          ...patch,
        },
      },
    }));
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await apiFetch('/payroll/policy', {
        method: 'PUT',
        body: JSON.stringify({
          hotelId,
          ...draft,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to save attendance & deduction policy');
      }
      onPolicySaved(json.policy || draft, 'Attendance automation & portal deduction rules saved.');
    } catch (err: any) {
      onError(err?.message || 'Unable to save policy');
    } finally {
      setSaving(false);
    }
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const staffPortal = (s.portalKey || 'waiter') as PortalRuleKey;
      if (portalFilter !== 'ALL' && staffPortal !== portalFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.role.toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [staffList, portalFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Automation Toggles & Portal Deduction Config */}
      <form onSubmit={handleSavePolicy} className="space-y-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Automatic Attendance & Salary Deduction Controls
                </h2>
                <p className="text-xs text-slate-500">
                  Automatically mark staff Present on login/PIN sign-in, mark Absent after shift cutoff, and apply portal-specific salary cuts.
                </p>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              data-testid="save-payroll-policy-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm disabled:opacity-60 transition shrink-0"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{saving ? 'Saving Policy...' : 'Save All Portal Rules'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.autoAttendanceEnabled}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, autoAttendanceEnabled: e.target.checked }))
                }
                className="mt-1 w-4 h-4 accent-blue-600 rounded"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900">Auto-Present on Login</div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Staff logging in or entering PIN automatically punch in as Present.
                </p>
              </div>
            </label>

            <label className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.autoMarkAbsentAfterCutoff}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, autoMarkAbsentAfterCutoff: e.target.checked }))
                }
                className="mt-1 w-4 h-4 accent-blue-600 rounded"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900">Auto-Absent After Cutoff</div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mark unpunched staff as Absent automatically after the daily cutoff time.
                </p>
              </div>
            </label>

            <label className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.autoApplyAbsenceDeduction}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, autoApplyAbsenceDeduction: e.target.checked }))
                }
                className="mt-1 w-4 h-4 accent-blue-600 rounded"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900">Auto-Post Deductions</div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatically deduct Absent / Half-Day amounts from Net Payable ledger.
                </p>
              </div>
            </label>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Daily Shift Cutoff Time (IST)
              </label>
              <input
                type="time"
                value={draft.absenceCutoffTime}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, absenceCutoffTime: e.target.value || '11:30' }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Portal-by-Portal Deduction Rules Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {PORTAL_RULE_META.map((meta) => {
            const rule = draft.portalDeductionRules[meta.key];
            const isPortalActive =
              meta.key === 'admin' || enabledPortals.includes(meta.key);
            const portalStaffCount = staffList.filter((s) => s.portalKey === meta.key).length;

            return (
              <div
                key={meta.key}
                data-testid={`portal-rule-card-${meta.key}`}
                className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">{meta.label}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isPortalActive
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {isPortalActive ? 'Active Portal' : 'Disabled in Plan'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {portalStaffCount} Staff
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{meta.description}</p>
                  </div>

                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={rule.deductOnAbsent}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updatePortalRule(meta.key, {
                          deductOnAbsent: checked,
                          mode: checked
                            ? rule.mode === 'NO_DEDUCTION'
                              ? 'PRO_RATA'
                              : rule.mode
                            : 'NO_DEDUCTION',
                        });
                      }}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      {rule.deductOnAbsent ? 'Deduct Enabled' : 'No Cut'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Deduction Mode
                    </label>
                    <select
                      value={rule.deductOnAbsent ? rule.mode : 'NO_DEDUCTION'}
                      onChange={(e) => {
                        const nextMode = e.target.value as DeductionMode;
                        updatePortalRule(meta.key, {
                          mode: nextMode,
                          deductOnAbsent: nextMode !== 'NO_DEDUCTION',
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    >
                      <option value="NO_DEDUCTION">No Deduction (₹0)</option>
                      <option value="PRO_RATA">Pro-Rata (Base ÷ 30)</option>
                      <option value="FIXED_AMOUNT">Fixed ₹ / Absent Day</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Per-Day Fixed (₹)
                    </label>
                    <NumericInput
                      data-testid={`portal-perday-input-${meta.key}`}
                      min="0"
                      step="10"
                      disabled={!rule.deductOnAbsent || rule.mode !== 'FIXED_AMOUNT'}
                      value={rule.perDayAmount}
                      onChange={(e) =>
                        updatePortalRule(meta.key, {
                          perDayAmount: Math.max(0, Number(e.target.value || 0)),
                        })
                      }
                      placeholder="300"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Half-Day Cut (%)
                    </label>
                    <NumericInput
                      data-testid={`portal-halfday-input-${meta.key}`}
                      min="0"
                      max="100"
                      step="1"
                      disabled={!rule.deductOnAbsent || rule.mode === 'NO_DEDUCTION'}
                      value={rule.halfDayPercent}
                      onChange={(e) =>
                        updatePortalRule(meta.key, {
                          halfDayPercent: Math.min(100, Math.max(0, Number(e.target.value || 0))),
                        })
                      }
                      placeholder="50"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-semibold disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </form>

      {/* Per-Staff / Per-Waiter Override Matrix */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Individual Staff & Waiter Per-Day Deduction Overrides
              </h3>
              <p className="text-xs text-slate-500">
                Override portal defaults for any specific Waiter, Chef, Cashier, or Manager.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search waiter or staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            {(['ALL', 'waiter', 'kds', 'cashier', 'reception', 'admin'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPortalFilter(key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  portalFilter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {key === 'ALL' ? 'All Portals' : getPortalShortLabel(key)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-5">Staff Member</th>
                <th className="py-3 px-4">Portal</th>
                <th className="py-3 px-4 text-right">Base Salary</th>
                <th className="py-3 px-4">Applied Rule</th>
                <th className="py-3 px-4 text-right">Per Absent Day</th>
                <th className="py-3 px-4 text-right">Half-Day Cut</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredStaff.map((staff) => {
                const resolved = staff.resolvedDeductionPolicy;
                const isCustom = resolved?.source === 'STAFF_OVERRIDE';
                return (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900">{staff.name}</div>
                      <div className="text-xs text-slate-500">{staff.role}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {getPortalShortLabel(staff.portalKey)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                      {formatInr(staff.baseSalary)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          isCustom
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {isCustom
                          ? `Custom (${resolved?.overrideMode === 'NO_DEDUCTION' ? 'No Cut' : resolved?.overrideMode === 'FIXED_AMOUNT' ? 'Fixed' : 'Pro-Rata'})`
                          : 'Portal Default'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {resolved?.deductOnAbsent && resolved.effectivePerDayAmount > 0
                        ? `-${formatInr(resolved.effectivePerDayAmount)}`
                        : '₹0 (No Cut)'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600 font-medium">
                      {resolved?.deductOnAbsent && resolved.halfDayAmount > 0
                        ? `-${formatInr(resolved.halfDayAmount)} (${resolved.halfDayPercent}%)`
                        : '₹0'}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        data-testid={`customize-staff-rule-${staff.id}`}
                        onClick={() => onEditStaffRule(staff)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Set Staff Rule</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                    No staff members match the selected portal or search filter.
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
