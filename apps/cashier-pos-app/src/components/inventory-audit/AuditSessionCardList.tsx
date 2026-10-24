import React from 'react';
import { IInventoryAuditSessionUI, InventoryAuditHelper } from '@spicehub/ui';

interface AuditSessionCardListProps {
  sessions: IInventoryAuditSessionUI[];
  selectedSession: IInventoryAuditSessionUI | null;
  onSelectSession: (session: IInventoryAuditSessionUI) => void;
  onOpenCountModal: (session: IInventoryAuditSessionUI) => void;
  onOpenReconcileModal: (session: IInventoryAuditSessionUI) => void;
}

export const AuditSessionCardList: React.FC<AuditSessionCardListProps> = ({
  sessions,
  selectedSession,
  onSelectSession,
  onOpenCountModal,
  onOpenReconcileModal,
}) => {
  if (sessions.length === 0) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center">
        <span className="text-4xl">📋</span>
        <h3 className="text-base font-bold text-white mt-3">No Audit Sessions Found</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          No stocktake audit records match current filter criteria. Click "Start New Audit Session" above to launch a physical audit.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sessions.map((session) => {
        const statusBadge = InventoryAuditHelper.getAuditStatusBadge(session.status);
        const isSelected = selectedSession?._id === session._id;
        const discrepantCount = session.items?.filter((it) => it.varianceQuantity !== 0).length || 0;

        return (
          <div
            key={session._id}
            onClick={() => onSelectSession(session)}
            className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between ${
              isSelected
                ? 'bg-zinc-900/95 border-emerald-500 shadow-xl shadow-emerald-950/30 ring-1 ring-emerald-500'
                : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-sm font-black text-white font-mono">{session.auditNumber}</span>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {InventoryAuditHelper.getAuditTypeLabel(session.auditType)}
                  </div>
                </div>

                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
                  style={{
                    backgroundColor: statusBadge.bg,
                    color: statusBadge.text,
                    border: statusBadge.border,
                  }}
                >
                  {statusBadge.label}
                </span>
              </div>

              {/* Badges / Store Details */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4 text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-medium">
                  📍 {session.storeLocation}
                </span>
                {session.isBlindStocktake ? (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                    🛡️ Blind Count
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                    Standard Count
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                  {session.items?.length || 0} items
                </span>
              </div>

              {/* Financial Metrics Box */}
              <div className="bg-[#0c0f16] border border-zinc-800/80 rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Discrepant Lines:</span>
                  <span className={discrepantCount > 0 ? 'text-amber-400 font-bold' : 'text-zinc-300'}>
                    {discrepantCount} / {session.items?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Shortage Loss:</span>
                  <span className="text-rose-400 font-bold">
                    {InventoryAuditHelper.formatCurrency(session.totalShortageValue)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Surplus Gain:</span>
                  <span className="text-blue-400 font-bold">
                    {InventoryAuditHelper.formatCurrency(session.totalSurplusValue)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-zinc-800 text-zinc-200 font-bold">
                  <span>Net Impact:</span>
                  <span
                    className={
                      session.netDiscrepancyValue < 0
                        ? 'text-rose-400'
                        : session.netDiscrepancyValue > 0
                        ? 'text-emerald-400'
                        : 'text-zinc-300'
                    }
                  >
                    {InventoryAuditHelper.formatCurrency(session.netDiscrepancyValue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-zinc-800/80 flex items-center gap-2">
              {session.status !== 'RECONCILED' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCountModal(session);
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all text-center"
                >
                  📝 Count Stock
                </button>
              )}

              {session.status === 'DISCREPANCY_FLAGGED' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenReconcileModal(session);
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold transition-all text-center"
                >
                  ⚖️ Reconcile
                </button>
              )}

              {session.status === 'RECONCILED' && (
                <span className="w-full text-center text-xs text-emerald-400 font-semibold py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  ✓ Ledger Balanced
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
