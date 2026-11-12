import React, { useState } from 'react';
import { TableStatus } from '@spicehub/shared-types';
import { TableStatusColorMap, formatCurrency, LiveTableCardModel, TableActionPayload, NumericInput } from '@spicehub/ui';
import { Play, UserCheck, Receipt, Brush, Sparkles, X } from 'lucide-react';

export interface TableActionDrawerProps {
  table: LiveTableCardModel | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: TableActionPayload) => void | Promise<void>;
}

export const TableActionDrawer: React.FC<TableActionDrawerProps> = ({
  table,
  isOpen,
  onClose,
  onAction,
}) => {
  const [guestCount, setGuestCount] = useState<number>(2);

  if (!isOpen || !table) return null;

  const statusConfig = TableStatusColorMap[table.currentStatus];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-white border-l border-slate-200 h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Table {table.tableNumber}
              </h2>
              <p className="text-xs text-slate-500 uppercase tracking-wider">{table.section} Section • Max {table.capacity} Pax</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="my-4">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
              Current Status: {statusConfig.label}
            </span>
          </div>

          {/* Table Details */}
          {table.currentStatus === TableStatus.OCCUPIED && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Active Bill Total:</span>
                <span className="font-bold text-emerald-600">{formatCurrency(table.activeOrderTotal || 0)}</span>
              </div>
              {table.activeSessionId && (
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Session Ref:</span>
                  <span className="font-mono">{table.activeSessionId.substring(0, 8)}...</span>
                </div>
              )}
            </div>
          )}

          {/* Action Options */}
          <div className="space-y-3 mt-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</h3>

            {table.currentStatus === TableStatus.AVAILABLE && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-semibold text-slate-700">Guests:</label>
                  <NumericInput
                    min={1}
                    max={table.capacity}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-20 px-2 py-1.5 border border-slate-200 rounded-xl text-center text-sm font-bold bg-slate-50 text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  onClick={() => onAction({ tableId: table.id, action: 'START_SESSION', guestCount })}
                  className="btn-glass-green w-full py-2.5 px-4 font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Dining Session</span>
                </button>
              </div>
            )}

            {table.currentStatus === TableStatus.RESERVED && (
              <button
                onClick={() => onAction({ tableId: table.id, action: 'SEAT_RESERVATION' })}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>Seat Reserved Guest</span>
              </button>
            )}

            {table.currentStatus === TableStatus.OCCUPIED && (
              <button
                onClick={() => onAction({ tableId: table.id, action: 'BILL_REQUEST', newStatus: TableStatus.BILLING })}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                <span>Request Bill / Settle</span>
              </button>
            )}

            {(table.currentStatus === TableStatus.BILLING || table.currentStatus === TableStatus.PAYMENT_SETTLED) && (
              <button
                onClick={() => onAction({ tableId: table.id, action: 'CHANGE_STATUS', newStatus: TableStatus.DIRTY })}
                className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <Brush className="w-4 h-4" />
                <span>Clear Table (Mark Dirty)</span>
              </button>
            )}

            {table.currentStatus === TableStatus.DIRTY && (
              <button
                onClick={() => onAction({ tableId: table.id, action: 'CHANGE_STATUS', newStatus: TableStatus.AVAILABLE })}
                className="btn-glass-green w-full py-2.5 px-4 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Cleaned & Available</span>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 px-4 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
