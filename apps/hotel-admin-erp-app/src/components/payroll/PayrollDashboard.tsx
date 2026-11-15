import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  Banknote,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  Receipt,
  Calendar,
  DollarSign,
  CreditCard,
  ArrowDownRight,
  RefreshCw,
  X,
  Edit2,
  Trash2,
  ChevronRight,
  User,
  ShieldCheck,
  Building2,
  FileText,
  BadgePercent,
  Sliders,
  Zap,
} from 'lucide-react';
import { apiFetch, getStoredHotelId } from '../../config/api';
import { NumericInput } from '@spicehub/ui';
import { AttendanceBoardTab } from './AttendanceBoardTab';
import { PayrollPolicyTab } from './PayrollPolicyTab';
import { StaffDeductionRuleModal } from './StaffDeductionRuleModal';
import {
  AttendanceStatsSummary,
  DEFAULT_PAYROLL_POLICY,
  NormalizedPayrollPolicy,
  PortalRuleKey,
  ResolvedStaffDeduction,
  StaffDeductionOverride,
  getAttendanceBadgeClasses,
  getAttendanceSourceLabel,
  getPortalShortLabel,
} from './payrollTypes';

export interface PayrollStaff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  portalKey?: PortalRuleKey;
  shift: string;
  shiftStatus: string;
  avatar?: string;
  baseSalary: number;
  salaryCycle: 'MONTHLY' | 'WEEKLY' | 'DAILY';
  totalPaid: number;
  totalSalaryPaid: number;
  advancesTaken: number;
  totalBonus: number;
  totalDeductions: number;
  autoAbsenceDeductions?: number;
  pendingBalance: number;
  currentMonthPaid: number;
  lastPaymentDate: string | null;
  transactionCount: number;
  todayAttendanceStatus?: string;
  todayAttendanceSource?: string | null;
  todayClockInTime?: string | null;
  attendanceStats?: AttendanceStatsSummary;
  payrollDeductionOverride?: StaffDeductionOverride;
  resolvedDeductionPolicy?: ResolvedStaffDeduction;
}

export interface PayrollSummary {
  totalMonthlyPayroll: number;
  paidThisMonth: number;
  totalPendingAmount: number;
  totalMonthDeductions?: number;
  totalStaffCount: number;
  presentTodayCount?: number;
  absentTodayCount?: number;
  portalFilterSummary: {
    enabledPortals: string[];
    totalEligibleStaff: number;
  };
}

export interface SalaryTxn {
  id: string;
  amount: number;
  type: 'SALARY' | 'ADVANCE' | 'BONUS' | 'DEDUCTION';
  source?: 'MANUAL' | 'AUTO_ATTENDANCE';
  attendanceDateKey?: string;
  date: string;
  status: 'PAID' | 'PENDING';
  paymentMethod: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface StaffLedgerDetail {
  staff: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    shift: string;
    shiftStatus: string;
    avatar?: string;
    baseSalary: number;
    salaryCycle: 'MONTHLY' | 'WEEKLY' | 'DAILY';
  };
  summary: {
    baseSalary: number;
    totalPaid: number;
    totalSalaryPaid: number;
    advancesTaken: number;
    totalBonus: number;
    totalDeductions: number;
    netPayable: number;
    transactionCount: number;
  };
  transactions: SalaryTxn[];
}

interface PayrollDashboardProps {
  hotelId?: string;
}

export const PayrollDashboard: React.FC<PayrollDashboardProps> = ({ hotelId: propHotelId }) => {
  const hotelId = propHotelId || getStoredHotelId();

  const [activeTab, setActiveTab] = useState<'PAYROLL' | 'ATTENDANCE' | 'RULES'>('PAYROLL');
  const [payrollPolicy, setPayrollPolicy] = useState<NormalizedPayrollPolicy>(DEFAULT_PAYROLL_POLICY);
  const [todayDateKey, setTodayDateKey] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [editingRuleStaff, setEditingRuleStaff] = useState<PayrollStaff | null>(null);

  const [staffList, setStaffList] = useState<PayrollStaff[]>([]);
  const [summary, setSummary] = useState<PayrollSummary>({
    totalMonthlyPayroll: 0,
    paidThisMonth: 0,
    totalPendingAmount: 0,
    totalMonthDeductions: 0,
    totalStaffCount: 0,
    presentTodayCount: 0,
    absentTodayCount: 0,
    portalFilterSummary: {
      enabledPortals: [],
      totalEligibleStaff: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // Ledger Modal State
  const [selectedStaffForLedger, setSelectedStaffForLedger] = useState<PayrollStaff | null>(null);
  const [ledgerData, setLedgerData] = useState<StaffLedgerDetail | null>(null);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  // Transaction Modal State
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionSubmitting, setTransactionSubmitting] = useState(false);
  const [transactionForm, setTransactionForm] = useState<{
    staffId: string;
    type: 'SALARY' | 'ADVANCE' | 'BONUS' | 'DEDUCTION';
    amount: string;
    paymentMethod: string;
    status: 'PAID' | 'PENDING';
    date: string;
    notes: string;
  }>({
    staffId: '',
    type: 'SALARY',
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    status: 'PAID',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Base Salary Edit Modal State
  const [showSalaryEditModal, setShowSalaryEditModal] = useState(false);
  const [editingStaffSalary, setEditingStaffSalary] = useState<{
    staffId: string;
    name: string;
    role: string;
    baseSalary: string;
    salaryCycle: 'MONTHLY' | 'WEEKLY' | 'DAILY';
  } | null>(null);
  const [salarySaving, setSalarySaving] = useState(false);

  // Edit Transaction Modal State
  const [editingTxn, setEditingTxn] = useState<SalaryTxn | null>(null);
  const [showEditTxnModal, setShowEditTxnModal] = useState(false);
  const [editTxnSaving, setEditTxnSaving] = useState(false);
  const [editTxnForm, setEditTxnForm] = useState<{
    amount: string;
    type: 'SALARY' | 'ADVANCE' | 'BONUS' | 'DEDUCTION';
    paymentMethod: string;
    status: 'PAID' | 'PENDING';
    date: string;
    notes: string;
  }>({
    amount: '',
    type: 'ADVANCE',
    paymentMethod: 'CASH',
    status: 'PAID',
    date: '',
    notes: '',
  });

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  const fetchPayrollDirectory = useCallback(async () => {
    if (!hotelId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/payroll/staff-list?hotelId=${hotelId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to fetch payroll list (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setStaffList(data.staff || []);
        if (data.todayDateKey) {
          setTodayDateKey(data.todayDateKey);
        }
        if (data.payrollPolicy) {
          setPayrollPolicy(data.payrollPolicy);
        }
        if (data.summary) {
          setSummary({
            totalMonthlyPayroll: Number(data.summary.totalMonthlyPayroll || 0),
            paidThisMonth: Number(data.summary.paidThisMonth || 0),
            totalPendingAmount: Number(data.summary.totalPendingAmount || 0),
            totalMonthDeductions: Number(data.summary.totalMonthDeductions || 0),
            totalStaffCount: Number(data.summary.totalStaffCount || (data.staff?.length || 0)),
            presentTodayCount: Number(data.summary.presentTodayCount || 0),
            absentTodayCount: Number(data.summary.absentTodayCount || 0),
            portalFilterSummary: {
              enabledPortals: Array.isArray(data.enabledPortals)
                ? data.enabledPortals
                : (data.summary.portalFilterSummary?.enabledPortals || []),
              totalEligibleStaff: Number(data.summary.totalStaffCount || (data.staff?.length || 0)),
            },
          });
        }
      } else {
        throw new Error(data.message || 'Could not load payroll directory.');
      }
    } catch (err: any) {
      console.error('Payroll fetch error:', err);
      setError(err.message || 'Unable to load payroll data.');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    fetchPayrollDirectory();
  }, [fetchPayrollDirectory]);

  // Load Staff Ledger
  const fetchStaffLedger = async (staff: PayrollStaff) => {
    setSelectedStaffForLedger(staff);
    setIsLedgerLoading(true);
    setLedgerData(null);
    try {
      const res = await apiFetch(`/payroll/ledger/${staff.id}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to fetch staff ledger');
      }
      const data = await res.json();
      if (data.success) {
        setLedgerData(data);
      } else {
        throw new Error(data.message || 'Failed to load ledger records');
      }
    } catch (err: any) {
      console.error('Ledger fetch error:', err);
      showNotification(err.message || 'Failed to load staff ledger.', 'error');
    } finally {
      setIsLedgerLoading(false);
    }
  };

  // Open Quick Transaction Form
  const openTransactionModal = (staff?: PayrollStaff, defaultType: 'SALARY' | 'ADVANCE' | 'BONUS' | 'DEDUCTION' = 'SALARY') => {
    setTransactionForm({
      staffId: staff ? staff.id : staffList[0]?.id || '',
      type: defaultType,
      amount: defaultType === 'SALARY' && staff ? String(staff.pendingBalance > 0 ? staff.pendingBalance : staff.baseSalary) : '',
      paymentMethod: 'BANK_TRANSFER',
      status: 'PAID',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowTransactionModal(true);
  };

  // Submit Transaction
  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionForm.staffId) {
      showNotification('Please select a staff member.', 'error');
      return;
    }
    const numAmount = parseFloat(transactionForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showNotification('Please enter a valid amount greater than ₹0.', 'error');
      return;
    }

    setTransactionSubmitting(true);
    try {
      const res = await apiFetch('/payroll/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          staffId: transactionForm.staffId,
          amount: numAmount,
          type: transactionForm.type,
          paymentMethod: transactionForm.paymentMethod,
          status: transactionForm.status,
          date: transactionForm.date,
          notes: transactionForm.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to record transaction.');
      }

      showNotification(`Successfully recorded ${transactionForm.type} of ₹${numAmount.toLocaleString('en-IN')}`);
      setShowTransactionModal(false);

      // Refresh directory
      await fetchPayrollDirectory();

      // If ledger is open for this staff member, refresh it
      if (selectedStaffForLedger && selectedStaffForLedger.id === transactionForm.staffId) {
        const updatedStaff = staffList.find((s) => s.id === transactionForm.staffId) || selectedStaffForLedger;
        fetchStaffLedger(updatedStaff);
      }
    } catch (err: any) {
      console.error('Transaction record error:', err);
      showNotification(err.message || 'Failed to record transaction.', 'error');
    } finally {
      setTransactionSubmitting(false);
    }
  };

  // Helper to format date for datetime-local
  const formatDateTimeForInput = (dateInput?: string | Date) => {
    if (!dateInput) return new Date().toISOString().slice(0, 16);
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 16);
      const pad = (n: number) => String(n).padStart(2, '0');
      const YYYY = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const DD = pad(d.getDate());
      const hh = pad(d.getHours());
      const mm = pad(d.getMinutes());
      return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
    } catch {
      return new Date().toISOString().slice(0, 16);
    }
  };

  // Open Edit Transaction Modal
  const openEditTxnModal = (txn: SalaryTxn) => {
    setEditingTxn(txn);
    setEditTxnForm({
      amount: String(txn.amount || ''),
      type: txn.type,
      paymentMethod: txn.paymentMethod || 'BANK_TRANSFER',
      status: txn.status || 'PAID',
      date: formatDateTimeForInput(txn.date || txn.createdAt),
      notes: txn.notes || '',
    });
    setShowEditTxnModal(true);
  };

  // Submit Updated Transaction
  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxn) return;

    const numAmount = parseFloat(editTxnForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showNotification('Please enter a valid amount greater than ₹0.', 'error');
      return;
    }

    setEditTxnSaving(true);
    try {
      const res = await apiFetch(`/payroll/transaction/${editingTxn.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          type: editTxnForm.type,
          paymentMethod: editTxnForm.paymentMethod,
          status: editTxnForm.status,
          date: editTxnForm.date,
          notes: editTxnForm.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update transaction.');
      }

      showNotification(`Successfully updated ${editTxnForm.type} of ₹${numAmount.toLocaleString('en-IN')}`);
      setShowEditTxnModal(false);
      setEditingTxn(null);

      // Refresh directory
      await fetchPayrollDirectory();

      // Refresh ledger if open
      if (selectedStaffForLedger) {
        const updatedStaff = staffList.find((s) => s.id === selectedStaffForLedger.id) || selectedStaffForLedger;
        fetchStaffLedger(updatedStaff);
      }
    } catch (err: any) {
      console.error('Transaction update error:', err);
      showNotification(err.message || 'Failed to update transaction.', 'error');
    } finally {
      setEditTxnSaving(false);
    }
  };

  // Delete Mistaken Transaction
  const handleDeleteTransaction = async (txn: SalaryTxn) => {
    const confirmMsg = `Are you sure you want to delete this ${txn.type} of ₹${Number(txn.amount || 0).toLocaleString('en-IN')}?\n\nThis will immediately recalculate the staff ledger, total advances, and pending balance.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await apiFetch(`/payroll/transaction/${txn.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete transaction.');
      }

      showNotification(`Successfully deleted ${txn.type} of ₹${Number(txn.amount || 0).toLocaleString('en-IN')}`);

      // Refresh directory and staff ledger
      await fetchPayrollDirectory();
      if (selectedStaffForLedger) {
        const updatedStaff = staffList.find((s) => s.id === selectedStaffForLedger.id) || selectedStaffForLedger;
        fetchStaffLedger(updatedStaff);
      }
    } catch (err: any) {
      console.error('Transaction delete error:', err);
      showNotification(err.message || 'Failed to delete transaction.', 'error');
    }
  };

  // Open Edit Base Salary Modal
  const openSalaryEditModal = (staff: PayrollStaff) => {
    setEditingStaffSalary({
      staffId: staff.id,
      name: staff.name,
      role: staff.role,
      baseSalary: String(staff.baseSalary),
      salaryCycle: staff.salaryCycle || 'MONTHLY',
    });
    setShowSalaryEditModal(true);
  };

  // Save Base Salary
  const handleSaveStaffSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffSalary) return;
    const numSalary = parseFloat(editingStaffSalary.baseSalary);
    if (isNaN(numSalary) || numSalary < 0) {
      showNotification('Base salary must be ₹0 or greater.', 'error');
      return;
    }

    setSalarySaving(true);
    try {
      const res = await apiFetch(`/payroll/staff/${editingStaffSalary.staffId}/salary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseSalary: numSalary,
          salaryCycle: editingStaffSalary.salaryCycle,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update salary.');
      }

      showNotification(`Base salary updated to ₹${numSalary.toLocaleString('en-IN')} for ${editingStaffSalary.name}`);
      setShowSalaryEditModal(false);
      await fetchPayrollDirectory();

      if (selectedStaffForLedger && selectedStaffForLedger.id === editingStaffSalary.staffId) {
        const updated = staffList.find((s) => s.id === editingStaffSalary.staffId) || selectedStaffForLedger;
        fetchStaffLedger(updated);
      }
    } catch (err: any) {
      console.error('Update salary error:', err);
      showNotification(err.message || 'Failed to update base salary.', 'error');
    } finally {
      setSalarySaving(false);
    }
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const matchesSearch =
        searchQuery === '' ||
        staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.phone.includes(searchQuery);

      const matchesRole =
        selectedRoleFilter === 'ALL' ||
        staff.role.toUpperCase() === selectedRoleFilter.toUpperCase();

      return matchesSearch && matchesRole;
    });
  }, [staffList, searchQuery, selectedRoleFilter]);

  // Unique roles present for filter dropdown
  const availableRoles = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((s) => {
      if (s.role) set.add(s.role.toUpperCase());
    });
    return Array.from(set).sort();
  }, [staffList]);

  const formatCurrency = (val: number) => {
    return `₹${Math.round(val || 0).toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Staff Payroll & Salary Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Live compensation tracking, salary disbursement, staff advances, and real-time transaction ledger.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchPayrollDirectory}
            disabled={loading}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            data-testid="record-payroll-btn"
            onClick={() => openTransactionModal(undefined, 'SALARY')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment / Advance</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-1.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          data-testid="tab-payroll-ledger"
          onClick={() => setActiveTab('PAYROLL')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'PAYROLL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Salary & Ledger</span>
        </button>

        <button
          type="button"
          data-testid="tab-payroll-attendance"
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'ATTENDANCE'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Auto-Attendance & Roster</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'ATTENDANCE'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {summary.presentTodayCount ?? 0}P · {summary.absentTodayCount ?? 0}A
          </span>
        </button>

        <button
          type="button"
          data-testid="tab-payroll-rules"
          onClick={() => setActiveTab('RULES')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'RULES'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Portal & Staff Deduction Rules</span>
        </button>

        <div className="ml-auto hidden md:flex items-center gap-3 px-3 text-xs text-slate-500">
          <span>
            Auto-Present: <strong className="text-slate-800">{payrollPolicy.autoAttendanceEnabled ? 'ON' : 'OFF'}</strong>
          </span>
          <span>·</span>
          <span>
            Cutoff: <strong className="text-slate-800">{payrollPolicy.absenceCutoffTime} IST</strong>
          </span>
          {(summary.totalMonthDeductions ?? 0) > 0 && (
            <>
              <span>·</span>
              <span className="text-rose-700 font-semibold">
                Month Deductions: -{formatCurrency(summary.totalMonthDeductions || 0)}
              </span>
            </>
          )}
        </div>
      </div>

      {activeTab === 'ATTENDANCE' && (
        <AttendanceBoardTab
          hotelId={hotelId}
          todayDateKey={todayDateKey}
          staffList={staffList as any}
          onRefreshAll={fetchPayrollDirectory}
          onEditStaffRule={(staff) => setEditingRuleStaff(staff as any)}
          onNotify={showNotification}
        />
      )}

      {activeTab === 'RULES' && (
        <PayrollPolicyTab
          hotelId={hotelId}
          policy={payrollPolicy}
          enabledPortals={summary?.portalFilterSummary?.enabledPortals || []}
          staffList={staffList as any}
          onPolicySaved={(updated, msg) => {
            setPayrollPolicy(updated);
            showNotification(msg, 'success');
            fetchPayrollDirectory();
          }}
          onEditStaffRule={(staff) => setEditingRuleStaff(staff as any)}
          onError={(msg) => showNotification(msg, 'error')}
        />
      )}

      {activeTab === 'PAYROLL' && (
        <>
      {/* KPI Cards (Top 3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Monthly Payroll */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Monthly Payroll
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(summary.totalMonthlyPayroll)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Base payroll across {summary?.portalFilterSummary?.totalEligibleStaff || staffList.length} operational staff</span>
            </div>
          </div>
        </div>

        {/* Card 2: Paid This Month */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Paid This Month
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight">
              {formatCurrency(summary.paidThisMonth)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Disbursed salaries & advances in current calendar month</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Pending Amount */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Pending Amount
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">
              {formatCurrency(summary.totalPendingAmount)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Outstanding balance payable to staff members</span>
            </div>
          </div>
        </div>
      </div>

      {/* Portal Subscription Filter Notice */}
      {summary?.portalFilterSummary && (summary.portalFilterSummary.enabledPortals?.length || 0) > 0 && (
        <div className="bg-slate-100/80 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center justify-between text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>
              <strong>Portal Filter Applied:</strong> Only staff belonging to subscribed portals (
              <span className="text-slate-800 font-semibold">
                {summary.portalFilterSummary.enabledPortals.join(', ')}
              </span>
              ) are listed. Staff from disabled modules are safely excluded.
            </span>
          </div>
          <span className="text-slate-500">
            {filteredStaff.length} of {staffList.length} Staff
          </span>
        </div>
      )}

      {/* Controls: Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            data-testid="payroll-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, email, phone..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Role:</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedRoleFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Roles ({staffList.length})
          </button>
          {availableRoles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedRoleFilter === role
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Main Staff Payroll Data Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Loading payroll ledger directory...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <button
              onClick={fetchPayrollDirectory}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 shadow-2xs"
            >
              Retry
            </button>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <User className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-base font-semibold text-slate-800">No staff members found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedRoleFilter !== 'ALL'
                ? 'No staff members match your active search or role filter criteria.'
                : 'Add staff in the Staff & Terminals module to manage their compensation and payroll.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Staff Member</th>
                  <th className="py-3.5 px-3 font-semibold">Role & Today</th>
                  <th className="py-3.5 px-3 font-semibold text-right">Base Salary</th>
                  <th className="py-3.5 px-3 font-semibold text-right">Total Paid</th>
                  <th className="py-3.5 px-3 font-semibold text-right">Advances / Cuts</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Pending Balance</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {filteredStaff.map((staff) => {
                  const initials = staff.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase();

                  const hasPending = staff.pendingBalance > 0;
                  const attBadge = getAttendanceBadgeClasses(staff.todayAttendanceStatus);
                  const resolved = staff.resolvedDeductionPolicy;

                  return (
                    <tr
                      key={staff.id}
                      data-testid={`payroll-row-${staff.id}`}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => fetchStaffLedger(staff)}
                    >
                      {/* Column 1: Staff Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {staff.avatar ? (
                            <img
                              src={staff.avatar}
                              alt={staff.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                              {staff.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {staff.email || staff.phone || 'No contact email'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Role, Attendance & Per-Day Rule */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block px-2 py-0.5 rounded-sm font-semibold text-[10px] uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
                              {staff.role}
                            </span>
                            <span className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[10px] border ${attBadge.classes}`}>
                              {attBadge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                            <span>{getPortalShortLabel(staff.portalKey)}</span>
                            <span>·</span>
                            <span>
                              {resolved?.deductOnAbsent && resolved.effectivePerDayAmount > 0
                                ? `-${formatCurrency(resolved.effectivePerDayAmount)}/abs`
                                : 'No Abs Cut'}
                            </span>
                            {staff.todayAttendanceSource && (
                              <>
                                <span>·</span>
                                <span className="text-slate-400">{getAttendanceSourceLabel(staff.todayAttendanceSource)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Base Salary */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-bold text-slate-900 text-sm">
                            {formatCurrency(staff.baseSalary)}
                          </span>
                          <button
                            type="button"
                            title="Edit Base Salary"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSalaryEditModal(staff);
                            }}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-sm transition"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {staff.salaryCycle || 'MONTHLY'}
                        </div>
                      </td>

                      {/* Column 4: Total Paid */}
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-bold text-emerald-700 text-sm">
                          {formatCurrency(staff.totalPaid)}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          {staff.totalSalaryPaid > 0 && `Salary: ${formatCurrency(staff.totalSalaryPaid)}`}
                        </div>
                      </td>

                      {/* Column 5: Advances & Deductions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="space-y-0.5">
                          <span
                            className={`font-semibold text-xs px-2 py-0.5 rounded-sm ${
                              staff.advancesTaken > 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 font-bold'
                                : 'text-slate-500'
                            }`}
                          >
                            {formatCurrency(staff.advancesTaken)}
                          </span>
                          {staff.totalDeductions > 0 && (
                            <div className="text-[10px] font-semibold text-rose-700">
                              Cuts: -{formatCurrency(staff.totalDeductions)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 6: Pending Balance */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className={`inline-flex flex-col items-end px-2.5 py-1 rounded-lg border ${
                            hasPending
                              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                              : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                          }`}
                        >
                          <span className="font-extrabold text-sm tracking-tight">
                            {formatCurrency(staff.pendingBalance)}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            {hasPending ? 'Due Payable' : 'Settled'}
                          </span>
                        </div>
                      </td>

                      {/* Column 7: Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            data-testid={`set-rule-btn-${staff.id}`}
                            onClick={() => setEditingRuleStaff(staff)}
                            className="p-1.5 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg border border-slate-200 transition"
                            title="Configure Per-Staff Absence Deduction Rule"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            data-testid={`view-ledger-btn-${staff.id}`}
                            onClick={() => fetchStaffLedger(staff)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-200 transition"
                            title="View Full Salary Ledger"
                          >
                            <Receipt className="w-3.5 h-3.5 text-slate-600" />
                            <span>View Ledger</span>
                          </button>

                          <button
                            type="button"
                            data-testid={`pay-salary-btn-${staff.id}`}
                            onClick={() => openTransactionModal(staff, 'SALARY')}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition"
                            title="Disburse Salary or Advance"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: STAFF SALARY LEDGER & TRANSACTION HISTORY                        */}
      {/* ========================================================================= */}
      {selectedStaffForLedger && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      Salary Ledger: {selectedStaffForLedger.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                      {selectedStaffForLedger.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedStaffForLedger.email} · {selectedStaffForLedger.phone || 'No phone'} · Cycle: {selectedStaffForLedger.salaryCycle || 'MONTHLY'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStaffForLedger(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {isLedgerLoading ? (
                <div className="py-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">Loading ledger records...</p>
                </div>
              ) : (
                <>
                  {/* Ledger Metrics Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Base Salary
                      </div>
                      <div className="text-xl font-bold text-slate-900 mt-1">
                        {formatCurrency(ledgerData?.summary?.baseSalary ?? selectedStaffForLedger.baseSalary)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Cycle: {selectedStaffForLedger.salaryCycle || 'MONTHLY'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                        Total Paid
                      </div>
                      <div className="text-xl font-bold text-emerald-700 mt-1">
                        {formatCurrency(ledgerData?.summary?.totalPaid ?? selectedStaffForLedger.totalPaid)}
                      </div>
                      <div className="text-[10px] text-emerald-600 mt-0.5">
                        Salary + Advances
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                      <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                        Advances Taken
                      </div>
                      <div className="text-xl font-bold text-amber-700 mt-1">
                        {formatCurrency(ledgerData?.summary?.advancesTaken ?? selectedStaffForLedger.advancesTaken)}
                      </div>
                      <div className="text-[10px] text-amber-600 mt-0.5">
                        Pre-disbursed
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                      <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                        Net Payable
                      </div>
                      <div className="text-xl font-extrabold text-blue-700 mt-1">
                        {formatCurrency(ledgerData?.summary?.netPayable ?? selectedStaffForLedger.pendingBalance)}
                      </div>
                      <div className="text-[10px] text-blue-600 mt-0.5">
                        Pending Balance
                      </div>
                    </div>
                  </div>

                  {/* Monthly Attendance & Deduction Rule Strip */}
                  {selectedStaffForLedger.attendanceStats && (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex flex-wrap items-center gap-3 font-medium text-slate-700">
                        <span>
                          Month Attendance: <strong className="text-emerald-700">{selectedStaffForLedger.attendanceStats.presentDays}P</strong> ·{' '}
                          <strong className="text-rose-700">{selectedStaffForLedger.attendanceStats.absentDays}A</strong> ·{' '}
                          <strong className="text-amber-700">{selectedStaffForLedger.attendanceStats.halfDays}H</strong> ·{' '}
                          <strong className="text-blue-700">{selectedStaffForLedger.attendanceStats.leaveDays}L</strong>
                        </span>
                        {selectedStaffForLedger.totalDeductions > 0 && (
                          <span className="text-rose-700 font-semibold">
                            Total Cuts: -{formatCurrency(selectedStaffForLedger.totalDeductions)}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingRuleStaff(selectedStaffForLedger)}
                        className="inline-flex items-center gap-1 text-blue-700 hover:underline font-semibold"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>
                          Rule:{' '}
                          {selectedStaffForLedger.resolvedDeductionPolicy?.deductOnAbsent
                            ? `${formatCurrency(selectedStaffForLedger.resolvedDeductionPolicy.effectivePerDayAmount)}/day`
                            : 'No Cut'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Action Buttons Toolbar inside Ledger */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Quick Record Transaction:</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openTransactionModal(selectedStaffForLedger, 'SALARY')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay Salary</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openTransactionModal(selectedStaffForLedger, 'ADVANCE')}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Give Advance</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openTransactionModal(selectedStaffForLedger, 'BONUS')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
                      >
                        <BadgePercent className="w-3.5 h-3.5" />
                        <span>Add Bonus</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openTransactionModal(selectedStaffForLedger, 'DEDUCTION')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>Deduction</span>
                      </button>
                    </div>
                  </div>

                  {/* Past Transactions Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Transaction Audit History ({ledgerData?.transactions?.length || 0})
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        Chronological disbursement records
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      {ledgerData?.transactions && ledgerData.transactions.length > 0 ? (
                        <div className="overflow-x-auto max-h-72">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                              <tr>
                                <th className="py-2.5 px-3">Date & Time</th>
                                <th className="py-2.5 px-3">Type</th>
                                <th className="py-2.5 px-3 text-right">Amount</th>
                                <th className="py-2.5 px-3">Method</th>
                                <th className="py-2.5 px-3">Status</th>
                                <th className="py-2.5 px-3">Notes</th>
                                <th className="py-2.5 px-3">Recorded By</th>
                                <th className="py-2.5 px-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                              {ledgerData.transactions.map((t) => {
                                const typeBadge = {
                                  SALARY: 'bg-blue-50 text-blue-700 border-blue-200',
                                  ADVANCE: 'bg-amber-50 text-amber-700 border-amber-200',
                                  BONUS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                  DEDUCTION: 'bg-rose-50 text-rose-700 border-rose-200',
                                }[t.type] || 'bg-slate-100 text-slate-700 border-slate-200';

                                const txnDate = new Date(t.date || t.createdAt);
                                const formattedDate = txnDate.toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                });
                                const formattedTime = txnDate.toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                });

                                return (
                                  <tr key={t.id} className="hover:bg-slate-50/60 transition">
                                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                                      <div className="font-semibold text-slate-800">{formattedDate}</div>
                                      <div className="text-[10px] text-slate-400 font-normal">{formattedTime}</div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border uppercase tracking-wider ${typeBadge}`}>
                                          {t.type}
                                        </span>
                                        {t.source === 'AUTO_ATTENDANCE' && (
                                          <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                            AUTO
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                      {formatCurrency(t.amount)}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                      {t.paymentMethod}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                          t.status === 'PAID'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {t.status}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                                      {t.notes || '—'}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                                      {t.recordedBy || 'System Admin'}
                                    </td>
                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          type="button"
                                          onClick={() => openEditTxnModal(t)}
                                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                          title="Edit Entry (Fix Time, Date, Amount, Notes)"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTransaction(t)}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                          title="Delete Mistaken Entry"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-8 text-center space-y-2">
                          <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs font-semibold text-slate-600">No transactions recorded yet</p>
                          <p className="text-[11px] text-slate-400">
                            Click "Pay Salary" or "Give Advance" above to record the first transaction for {selectedStaffForLedger.name}.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedStaffForLedger(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD SALARY TRANSACTION (PAY SALARY, ADVANCE, BONUS, DEDUCTION) */}
      {/* ========================================================================= */}
      {showTransactionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Record Payroll Transaction
                  </h3>
                  <p className="text-xs text-slate-500">
                    Disburse salary payment, record advances, bonuses or deductions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTransactionModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordTransaction} className="p-6 space-y-4">
              {/* Staff Member */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Staff Member *
                </label>
                <select
                  data-testid="txn-staff-select"
                  value={transactionForm.staffId}
                  onChange={(e) => {
                    const chosen = staffList.find((s) => s.id === e.target.value);
                    setTransactionForm((prev) => ({
                      ...prev,
                      staffId: e.target.value,
                      amount: prev.type === 'SALARY' && chosen ? String(chosen.pendingBalance > 0 ? chosen.pendingBalance : chosen.baseSalary) : prev.amount,
                    }));
                  }}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>-- Select Staff Member --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role}) — Base: ₹{s.baseSalary.toLocaleString('en-IN')} | Pending: ₹{s.pendingBalance.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transaction Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Transaction Type *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['SALARY', 'ADVANCE', 'BONUS', 'DEDUCTION'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTransactionForm((prev) => ({ ...prev, type: t }))}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition border ${
                        transactionForm.type === t
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <NumericInput
                      step="any"
                      min="1"
                      data-testid="txn-amount-input"
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="e.g. 15000"
                      required
                      className="w-full pl-8 pr-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Disbursement Date *
                  </label>
                  <input
                    type="date"
                    data-testid="txn-date-input"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm((prev) => ({ ...prev, date: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Payment Mode & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={transactionForm.paymentMethod}
                    onChange={(e) => setTransactionForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI / Digital QR</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={transactionForm.status}
                    onChange={(e) => setTransactionForm((prev) => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PAID">PAID (Disbursed)</option>
                    <option value="PENDING">PENDING (Scheduled)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notes / Memo (Optional)
                </label>
                <textarea
                  rows={2}
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Month end settlement, Festival advance, Overtime performance bonus..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-transaction-btn"
                  disabled={transactionSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                >
                  {transactionSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Disburse</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT BASE SALARY & CYCLE                                         */}
      {/* ========================================================================= */}
      {showSalaryEditModal && editingStaffSalary && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Update Base Salary
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingStaffSalary.name} ({editingStaffSalary.role})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSalaryEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffSalary} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Base Salary (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <NumericInput
                    step="any"
                    min="0"
                    data-testid="edit-base-salary-input"
                    value={editingStaffSalary.baseSalary}
                    onChange={(e) => setEditingStaffSalary((prev: any) => ({ ...prev, baseSalary: e.target.value }))}
                    placeholder="e.g. 25000"
                    required
                    className="w-full pl-8 pr-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Salary Cycle *
                </label>
                <select
                  value={editingStaffSalary.salaryCycle}
                  onChange={(e) => setEditingStaffSalary((prev: any) => ({ ...prev, salaryCycle: e.target.value as any }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MONTHLY">MONTHLY (Default)</option>
                  <option value="WEEKLY">WEEKLY</option>
                  <option value="DAILY">DAILY</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSalaryEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={salarySaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                >
                  {salarySaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT TRANSACTION (FIX ADVANCE, SALARY, BONUS, DEDUCTION)          */}
      {/* ========================================================================= */}
      {showEditTxnModal && editingTxn && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Edit {editTxnForm.type} Entry
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedStaffForLedger ? `${selectedStaffForLedger.name} (${selectedStaffForLedger.role})` : 'Modify payroll record'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditTxnModal(false);
                  setEditingTxn(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateTransaction} className="p-6 space-y-4">
              {/* Transaction Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Transaction Type *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['SALARY', 'ADVANCE', 'BONUS', 'DEDUCTION'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditTxnForm((prev) => ({ ...prev, type: t }))}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition border ${
                        editTxnForm.type === t
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Date/Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <NumericInput
                      step="any"
                      min="1"
                      value={editTxnForm.amount}
                      onChange={(e) => setEditTxnForm((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="e.g. 5000"
                      required
                      className="w-full pl-8 pr-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Disbursement Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={editTxnForm.date}
                    onChange={(e) => setEditTxnForm((prev) => ({ ...prev, date: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Payment Mode & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={editTxnForm.paymentMethod}
                    onChange={(e) => setEditTxnForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI / Digital QR</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={editTxnForm.status}
                    onChange={(e) => setEditTxnForm((prev) => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PAID">PAID (Disbursed)</option>
                    <option value="PENDING">PENDING (Scheduled)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notes / Reason for Edit
                </label>
                <textarea
                  rows={2}
                  value={editTxnForm.notes}
                  onChange={(e) => setEditTxnForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Corrected date/time, adjusted advance disbursement..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTxnModal(false);
                    setEditingTxn(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editTxnSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                >
                  {editTxnSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StaffDeductionRuleModal
        staff={editingRuleStaff as any}
        policy={payrollPolicy}
        onClose={() => setEditingRuleStaff(null)}
        onSaved={async (msg) => {
          showNotification(msg, 'success');
          await fetchPayrollDirectory();
          if (selectedStaffForLedger && editingRuleStaff && selectedStaffForLedger.id === editingRuleStaff.id) {
            fetchStaffLedger(selectedStaffForLedger);
          }
        }}
        onError={(msg) => showNotification(msg, 'error')}
      />
    </div>
  );
};
