import React from 'react';
import { TableStatus } from '@spicehub/shared-types';
import { TableStatusColorMap, formatCurrency, LiveTableCardModel, FloorLayoutHelper } from '@spicehub/ui';

export interface TableCardProps {
  table: LiveTableCardModel;
  onClick: (table: LiveTableCardModel) => void;
  isSelected?: boolean;
}

export const TableCard: React.FC<TableCardProps> = ({ table, onClick, isSelected }) => {
  const statusConfig = TableStatusColorMap[table.currentStatus] || TableStatusColorMap[TableStatus.AVAILABLE];
  const elapsedMinutes = FloorLayoutHelper.calculateElapsedMinutes(table.sessionStartTime);
  const formattedTime = FloorLayoutHelper.formatElapsedTime(elapsedMinutes);

  return (
    <div
      onClick={() => onClick(table)}
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none shadow-sm hover:shadow-md ${statusConfig.border} ${statusConfig.bg} ${
        isSelected ? 'ring-2 ring-primary-500 scale-[1.02]' : 'hover:scale-[1.01]'
      }`}
      data-testid={`table-card-${table.tableNumber}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-lg text-slate-800 dark:text-slate-100">
          Table {table.tableNumber}
        </span>
        <span
          className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${statusConfig.border} ${statusConfig.text}`}
        >
          {statusConfig.label}
        </span>
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
        <span>Capacity: {table.capacity} guests</span>
        <span className="uppercase text-[10px] tracking-wide">{table.section}</span>
      </div>

      {table.currentStatus === TableStatus.OCCUPIED && (
        <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-300">
            <span>⏱️</span>
            <span>{formattedTime}</span>
          </div>
          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(table.activeOrderTotal || 0)}
          </div>
        </div>
      )}

      {table.currentStatus === TableStatus.BILLING && (
        <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs font-bold text-amber-500">
          <span>Bill Requested</span>
          <span>{formatCurrency(table.activeOrderTotal || 0)}</span>
        </div>
      )}

      {table.currentStatus === TableStatus.DIRTY && (
        <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-xs text-orange-500 font-medium">
          Awaiting Busser / Cleaning
        </div>
      )}
    </div>
  );
};
