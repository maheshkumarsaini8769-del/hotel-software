import React, { useState, useEffect } from 'react';
import {
  IInventoryAuditSessionUI,
  IReconcilePayload,
  VarianceReasonUI,
  AuditActionTakenUI,
  InventoryAuditHelper,
} from '@spicehub/ui';

interface ReconciliationModalProps {
  session: IInventoryAuditSessionUI | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (auditId: string, payload: IReconcilePayload) => Promise<void>;
  loading: boolean;
}

interface ResolutionRow {
  itemName: string;
  varianceReason: VarianceReasonUI;
  actionTaken: AuditActionTakenUI;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  session,
  isOpen,
  onClose,
  onSubmit,
  loading,
}) => {
  const [resolutions, setResolutions] = useState<Record<string, ResolutionRow>>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (session && session.items) {
      const initial: Record<string, ResolutionRow> = {};
      session.items.forEach((it) => {
        if (it.varianceQuantity !== 0) {
          initial[it.itemName] = {
            itemName: it.itemName,
            varianceReason: it.varianceReason || 'UNRECORDED_WASTE',
            actionTaken: it.actionTaken || 'ADJUST_BOOK_STOCK',
          };
        }
      });
      setResolutions(initial);
      setNotes(session.notes || '');
    }
  }, [session]);

  if (!isOpen || !session) return null;

  const handleReasonChange = (itemName: string, reason: VarianceReasonUI) => {
    setResolutions((prev) => ({
      ...prev,
      [itemName]: {
        ...(prev[itemName] || { itemName, actionTaken: 'ADJUST_BOOK_STOCK' }),
        varianceReason: reason,
      },
    }));
  };

  const handleActionChange = (itemName: string, action: AuditActionTakenUI) => {
    setResolutions((prev) => ({
      ...prev,
      [itemName]: {
        ...(prev[itemName] || { itemName, varianceReason: 'UNRECORDED_WASTE' }),
        actionTaken: action,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemResolutions = Object.values(resolutions);
    await onSubmit(session._id, {
      itemResolutions,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const discrepantItems = session.items.filter((it) => it.varianceQuantity !== 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f131a] border border-teal-500/30 w-full max-w-4xl rounded-2xl p-6 shadow-2xl text-zinc-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                {session.auditNumber}
              </span>
              <h2 className="text-lg font-bold text-white">Discrepancy Reconciliation & Ledger Adjustment</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Financial controller sign-off for inventory shortages, pilferage write-offs, and book stock realignment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Financial Discrepancy KPI Banner */}
        <div className="mt-4 grid grid-cols-3 gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
          <div>
            <span className="text-[11px] text-rose-400 uppercase font-bold block">Total Shortage</span>
            <span className="text-lg font-bold text-rose-400">
              {InventoryAuditHelper.formatCurrency(session.totalShortageValue)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-blue-400 uppercase font-bold block">Total Surplus</span>
            <span className="text-lg font-bold text-blue-400">
              {InventoryAuditHelper.formatCurrency(session.totalSurplusValue)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-zinc-400 uppercase font-bold block">Net Variance Impact</span>
            <span
              className={`text-lg font-bold ${
                session.netDiscrepancyValue < 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {InventoryAuditHelper.formatCurrency(session.netDiscrepancyValue)}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {discrepantItems.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-sm">
              ✨ No variances detected! Physical counts match system book quantities 100%.
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                Discrepancy Resolutions Required ({discrepantItems.length} Items)
              </span>

              {discrepantItems.map((item, idx) => {
                const row = resolutions[item.itemName] || {
                  itemName: item.itemName,
                  varianceReason: 'UNRECORDED_WASTE',
                  actionTaken: 'ADJUST_BOOK_STOCK',
                };
                const pill = InventoryAuditHelper.getVariancePill(item.varianceQuantity, item.varianceValue);

                return (
                  <div
                    key={idx}
                    className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-bold text-white">{item.itemName}</span>
                        <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-3">
                          <span>System: <strong className="text-zinc-300">{item.systemBookQuantity} {item.unit}</strong></span>
                          <span>Physical: <strong className="text-amber-400">{item.physicalCountQuantity} {item.unit}</strong></span>
                          <span>Unit Cost: <strong className="text-zinc-300">{InventoryAuditHelper.formatCurrency(item.unitCost)}</strong></span>
                        </div>
                      </div>

                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-bold self-start sm:self-auto"
                        style={{ backgroundColor: pill.badge, color: pill.color }}
                      >
                        {pill.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
                      <div>
                        <label className="block text-[11px] text-zinc-400 uppercase font-semibold mb-1">
                          Audited Variance Reason
                        </label>
                        <select
                          value={row.varianceReason}
                          onChange={(e) =>
                            handleReasonChange(item.itemName, e.target.value as VarianceReasonUI)
                          }
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                        >
                          <option value="PILFERAGE_THEFT">Unauthorized Pilferage / Theft</option>
                          <option value="UNRECORDED_WASTE">Unrecorded Spoilage / Wastage</option>
                          <option value="COUNTING_ERROR">Physical Counting / Tally Error</option>
                          <option value="VENDOR_SHORTAGE">Vendor Short-Delivery Missed on Dock</option>
                          <option value="NORMAL_SHRINKAGE">Standard Moisture / Thaw Shrinkage</option>
                          <option value="RECIPE_OVER_PORTIONING">Kitchen Over-Portioning / Spillage</option>
                          <option value="OTHER">Other Operational Variance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-zinc-400 uppercase font-semibold mb-1">
                          Corrective Ledger Action
                        </label>
                        <select
                          value={row.actionTaken}
                          onChange={(e) =>
                            handleActionChange(item.itemName, e.target.value as AuditActionTakenUI)
                          }
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                        >
                          <option value="ADJUST_BOOK_STOCK">Adjust Book Stock Balance</option>
                          <option value="WRITE_OFF_TO_P_AND_L">Write Off Directly to P&L Expense</option>
                          <option value="RECOUNT_REQUESTED">Request Second Recount Verification</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              General Controller Sign-off Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Audit verified by Financial Controller. Variances reconciled into ERP general ledger."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-teal-900/30"
            >
              {loading ? 'Reconciling Ledger...' : 'Approve & Reconcile Book Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
