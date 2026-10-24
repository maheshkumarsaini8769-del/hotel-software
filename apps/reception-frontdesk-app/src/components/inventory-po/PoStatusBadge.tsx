import React from 'react';
import { InventoryPoHelper, PurchaseOrderStatusUI, GrnInspectionStatusUI } from '@spicehub/ui';

interface PoStatusBadgeProps {
  status: PurchaseOrderStatusUI;
}

export const PoStatusBadge: React.FC<PoStatusBadgeProps> = ({ status }) => {
  const badge = InventoryPoHelper.getPoStatusBadge(status);
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} ${badge.border} ${badge.text}`}
    >
      {badge.label}
    </span>
  );
};

interface GrnStatusBadgeProps {
  status: GrnInspectionStatusUI;
}

export const GrnStatusBadge: React.FC<GrnStatusBadgeProps> = ({ status }) => {
  const badge = InventoryPoHelper.getGrnStatusBadge(status);
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} ${badge.border} ${badge.text}`}
    >
      {badge.label}
    </span>
  );
};
