import React from 'react';
import {
  IStoreRequisitionUI,
  RequisitionStatusUI,
  RequisitionDepartmentUI,
  StoreRequisitionHelper,
} from '@spicehub/ui';

interface RequisitionCardListProps {
  requisitions: IStoreRequisitionUI[];
  selectedStatus: RequisitionStatusUI | 'ALL';
  onStatusChange: (status: RequisitionStatusUI | 'ALL') => void;
  selectedDepartment: RequisitionDepartmentUI | 'ALL';
  onDepartmentChange: (dept: RequisitionDepartmentUI | 'ALL') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onIssueClick: (req: IStoreRequisitionUI) => void;
  loading: boolean;
}

export const RequisitionCardList: React.FC<RequisitionCardListProps> = ({
  requisitions,
  selectedStatus,
  onStatusChange,
  selectedDepartment,
  onDepartmentChange,
  searchQuery,
  onSearchChange,
  onIssueClick,
  loading,
}) => {
  const statusTabs: Array<{ key: RequisitionStatusUI | 'ALL'; label: string }> = [
    { key: 'ALL', label: 'All Indents' },
    { key: 'PENDING', label: 'Pending Store Issue' },
    { key: 'APPROVED_ISSUED', label: '100% Fulfilled' },
    { key: 'APPROVED_PARTIALLY', label: 'Partially Issued' },
  ];

  const filtered = requisitions.filter((r) => {
    if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
    if (selectedDepartment !== 'ALL' && r.requestingDepartment !== selectedDepartment) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.requisitionNumber.toLowerCase().includes(q) ||
        r.requestingDepartment.toLowerCase().includes(q) ||
        r.items.some((it) => it.itemName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center flex-wrap gap-1.5">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onStatusChange(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                selectedStatus === tab.key
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search indent # or ingredient..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Indents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-zinc-500 text-sm flex flex-col items-center gap-2">
            <span className="text-3xl">📋</span>
            <span>No kitchen requisitions found for this filter</span>
          </div>
        ) : (
          filtered.map((req) => {
            const urgencyBadge = StoreRequisitionHelper.getUrgencyBadge(req.urgency);
            const statusBadge = StoreRequisitionHelper.getStatusBadge(req.status);

            return (
              <div
                key={req._id}
                className="bg-[#0f131a] rounded-2xl border border-zinc-800 hover:border-zinc-700 p-5 flex flex-col justify-between shadow-lg transition-all group"
              >
                <div>
                  {/* Top Bar: Requisition # & Urgency */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
                    <span className="font-mono text-xs font-bold text-amber-400 tracking-wide">
                      {req.requisitionNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgencyBadge.bg} ${urgencyBadge.border} ${urgencyBadge.text}`}>
                      {urgencyBadge.label}
                    </span>
                  </div>

                  {/* Department & Status */}
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                        {req.requestingDepartment}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="mt-4 bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold block pb-1 border-b border-zinc-800">
                      Requested Ingredients ({req.items.length})
                    </span>
                    {req.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-200 truncate max-w-[170px]">{it.itemName}</span>
                        <span className="font-mono font-bold text-amber-400">
                          {req.status === 'PENDING' ? `${it.requestedQuantity} ${it.unit}` : `${it.issuedQuantity}/${it.requestedQuantity} ${it.unit}`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {req.notes && (
                    <p className="text-xs text-zinc-400 mt-2 italic line-clamp-1">
                      Note: "{req.notes}"
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-zinc-800">
                  {req.status === 'PENDING' ? (
                    <button
                      type="button"
                      onClick={() => onIssueClick(req)}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] flex items-center justify-center gap-1.5"
                    >
                      <span>📦</span>
                      <span>Issue Stock (Storekeeper)</span>
                    </button>
                  ) : (
                    <div className="text-center py-1 text-xs text-zinc-400 font-mono">
                      ✓ Fulfilled {req.issuedAt ? new Date(req.issuedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
