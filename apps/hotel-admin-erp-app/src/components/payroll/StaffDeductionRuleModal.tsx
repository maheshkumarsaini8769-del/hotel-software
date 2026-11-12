import React, { useEffect, useState } from 'react';
import { X, Sliders, CheckCircle2, RefreshCw } from 'lucide-react';
import { NumericInput } from '@spicehub/ui';
import { apiFetch } from '../../config/api';
import {
  NormalizedPayrollPolicy,
  PayrollStaff,
  StaffOverrideMode,
  formatInr,
  getPortalShortLabel,
} from './payrollTypes';

interface StaffDeductionRuleModalProps {
  staff: PayrollStaff | null;
  policy: NormalizedPayrollPolicy;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

export const StaffDeductionRuleModal: React.FC<StaffDeductionRuleModalProps> = ({
  staff,
  policy,
  onClose,
  onSaved,
  onError,
}) => {
  const [mode, setMode] = useState<StaffOverrideMode>('INHERIT_PORTAL');
  const [perDayAmount, setPerDayAmount] = useState<string>('0');
  const [halfDayPercent, setHalfDayPercent] = useState<string>('50');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!staff) return;
    const portalKey = staff.portalKey || 'waiter';
    const portalRule = policy.portalDeductionRules[portalKey];
    const override = staff.payrollDeductionOverride;
    setMode(override?.mode || 'INHERIT_PORTAL');
    setPerDayAmount(String(override?.perDayDeductionAmount ?? portalRule?.perDayAmount ?? 0));
    setHalfDayPercent(String(override?.halfDayPercent ?? portalRule?.halfDayPercent ?? 50));
  }, [staff, policy]);

  if (!staff) return null;

  const portalKey = staff.portalKey || 'waiter';
  const portalRule = policy.portalDeductionRules[portalKey];
  const baseSalary = Number(staff.baseSalary || 0);
  const dailyProRata =
    staff.salaryCycle === 'DAILY'
      ? baseSalary
      : staff.salaryCycle === 'WEEKLY'
        ? Math.round(baseSalary / 7)
        : Math.round(baseSalary / 30);

  const portalPreviewPerDay = !portalRule?.deductOnAbsent
    ? 0
    : portalRule.mode === 'FIXED_AMOUNT'
      ? portalRule.perDayAmount
      : portalRule.mode === 'PRO_RATA'
        ? dailyProRata
        : 0;

  const parsedFixed = Math.max(0, Number(perDayAmount || 0));
  const parsedHalfPct = Math.min(100, Math.max(0, Number(halfDayPercent || 0)));

  const effectivePerDayPreview =
    mode === 'INHERIT_PORTAL'
      ? portalPreviewPerDay
      : mode === 'NO_DEDUCTION'
        ? 0
        : mode === 'FIXED_AMOUNT'
          ? parsedFixed
          : dailyProRata;

  const halfDayPreview = Math.round(
    (effectivePerDayPreview * (mode === 'INHERIT_PORTAL' ? portalRule.halfDayPercent : parsedHalfPct)) / 100
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await apiFetch(`/payroll/staff/${staff.id}/deduction-policy`, {
        method: 'PUT',
        body: JSON.stringify({
          mode,
          perDayDeductionAmount: parsedFixed,
          halfDayPercent: parsedHalfPct,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to update staff deduction rule');
      }
      onSaved(`Updated absence deduction rule for ${staff.name}.`);
      onClose();
    } catch (err: any) {
      onError(err?.message || 'Unable to save staff deduction rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Per-Staff Absence Deduction Rule
              </h3>
              <p className="text-xs text-slate-500">
                {staff.name} ({staff.role}) · {getPortalShortLabel(portalKey)} Portal · Base {formatInr(baseSalary)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Choose Deduction Policy for {staff.name}
            </label>

            {[
              {
                value: 'INHERIT_PORTAL' as StaffOverrideMode,
                title: `Use ${getPortalShortLabel(portalKey)} Portal Default`,
                desc: `Currently ${
                  portalRule.deductOnAbsent
                    ? portalRule.mode === 'FIXED_AMOUNT'
                      ? `${formatInr(portalRule.perDayAmount)}/day fixed`
                      : `Pro-rata (${formatInr(dailyProRata)}/day)`
                    : 'No Deduction on Absence'
                }`,
              },
              {
                value: 'FIXED_AMOUNT' as StaffOverrideMode,
                title: 'Custom Fixed Amount Per Absent Day (₹)',
                desc: 'Deduct an exact custom rupee amount whenever this staff member is absent',
              },
              {
                value: 'PRO_RATA' as StaffOverrideMode,
                title: 'Pro-Rata Daily Wage',
                desc: `Deduct Base Salary ÷ ${staff.salaryCycle === 'WEEKLY' ? 7 : staff.salaryCycle === 'DAILY' ? 1 : 30} (${formatInr(dailyProRata)}/day)`,
              },
              {
                value: 'NO_DEDUCTION' as StaffOverrideMode,
                title: 'No Deduction (Zero Cut on Absence)',
                desc: 'Protected staff member — ₹0 deducted even if marked absent',
              },
            ].map((option) => {
              const selected = mode === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                    selected
                      ? 'border-blue-600 bg-blue-50/70'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="staffOverrideMode"
                    checked={selected}
                    onChange={() => setMode(option.value)}
                    className="mt-1 accent-blue-600"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{option.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{option.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>

          {mode !== 'INHERIT_PORTAL' && mode !== 'NO_DEDUCTION' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {mode === 'FIXED_AMOUNT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Per-Day Absent Deduction (₹)
                  </label>
                  <NumericInput
                    data-testid="staff-override-per-day-input"
                    min="0"
                    step="10"
                    value={perDayAmount}
                    onChange={(e) => setPerDayAmount(e.target.value)}
                    placeholder="300"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              )}

              <div className={mode === 'PRO_RATA' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Half-Day Cut (% of full-day deduction)
                </label>
                <NumericInput
                  data-testid="staff-override-halfday-input"
                  min="0"
                  max="100"
                  step="1"
                  value={halfDayPercent}
                  onChange={(e) => setHalfDayPercent(e.target.value)}
                  placeholder="50"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Live Rule Preview
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Applied automatically whenever attendance is Absent or Half-Day
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900">
                Absent: {effectivePerDayPreview > 0 ? `-${formatInr(effectivePerDayPreview)}` : '₹0 (No Cut)'}
              </div>
              <div className="text-xs font-medium text-slate-500">
                Half-Day: {halfDayPreview > 0 ? `-${formatInr(halfDayPreview)}` : '₹0'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              data-testid="save-staff-override-btn"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm disabled:opacity-60 transition"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{saving ? 'Saving Rule...' : 'Save Staff Rule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
