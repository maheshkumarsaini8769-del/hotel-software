import React from 'react';
import { PurchaseOrderStatusUI, GrnInspectionStatusUI } from '@spicehub/ui';

interface PoStatusBadgeProps {
  status: PurchaseOrderStatusUI;
}

export const PoStatusBadge: React.FC<PoStatusBadgeProps> = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return {
          label: 'Pending Approval',
          dot: 'bg-amber-500',
          className: 'bg-amber-50 text-amber-700 border-amber-200/80',
        };
      case 'APPROVED':
        return {
          label: 'Approved (Awaiting Dock)',
          dot: 'bg-blue-500',
          className: 'bg-blue-50 text-blue-700 border-blue-200/80',
        };
      case 'PARTIALLY_RECEIVED':
        return {
          label: 'Partially Received',
          dot: 'bg-indigo-500 animate-pulse',
          className: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        };
      case 'COMPLETED':
        return {
          label: '100% Received',
          dot: 'bg-emerald-500',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          dot: 'bg-rose-500',
          className: 'bg-rose-50 text-rose-700 border-rose-200/80',
        };
      default:
        return {
          label: status,
          dot: 'bg-slate-400',
          className: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  const badge = getBadgeConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-xs ${badge.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
      <span>{badge.label}</span>
    </span>
  );
};

interface GrnStatusBadgeProps {
  status: GrnInspectionStatusUI;
}

export const GrnStatusBadge: React.FC<GrnStatusBadgeProps> = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'VERIFIED':
        return {
          label: 'Accepted (100% Passed)',
          dot: 'bg-emerald-500',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        };
      case 'FLAGGED_DISCREPANCY':
        return {
          label: 'Flagged (Discrepancy)',
          dot: 'bg-amber-500',
          className: 'bg-amber-50 text-amber-700 border-amber-200/80',
        };
      case 'REJECTED':
        return {
          label: 'Rejected at Dock',
          dot: 'bg-rose-500',
          className: 'bg-rose-50 text-rose-700 border-rose-200/80',
        };
      default:
        return {
          label: status,
          dot: 'bg-blue-500',
          className: 'bg-blue-50 text-blue-700 border-blue-200/80',
        };
    }
  };

  const badge = getBadgeConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-xs ${badge.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
      <span>{badge.label}</span>
    </span>
  );
};
