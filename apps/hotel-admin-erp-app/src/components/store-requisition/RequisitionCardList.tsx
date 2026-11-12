import React from 'react';
import {
  IStoreRequisitionUI,
  RequisitionStatusUI,
  RequisitionDepartmentUI,
  StoreRequisitionHelper,
} from '@spicehub/ui';
import { Search, ClipboardList, PackageCheck } from 'lucide-react';

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
                  ? 'btn-glass-green text-white shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-xs'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search indent # or ingredient..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Indents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-sm flex flex-col items-center gap-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <ClipboardList className="w-10 h-10 text-slate-400 mb-1" />
            <span className="font-medium text-slate-700">No kitchen requisitions found for this filter</span>
            <span className="text-xs text-slate-400">Try adjusting status or raising a new indent</span>
          </div>
        ) : (
          filtered.map((req) => {
            const urgencyBadge = StoreRequisitionHelper.getUrgencyBadge(req.urgency);
            const statusBadge = StoreRequisitionHelper.getStatusBadge(req.status);

            return (
              <div
                key={req._id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group"
              >
                <div>
                  {/* Top Bar: Requisition # & Urgency */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <span className="font-mono text-xs font-bold text-slate-800 tracking-wide">
                      {req.requisitionNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgencyBadge.bg} ${urgencyBadge.border} ${urgencyBadge.text}`}>
                      {urgencyBadge.label}
                    </span>
                  </div>

                  {/* Department & Status */}
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {req.requestingDepartment}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
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
                  <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block pb-1 border-b border-slate-200">
                      Requested Ingredients ({req.items.length})
                    </span>
                    {req.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-slate-800 truncate max-w-[170px] font-medium">{it.itemName}</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {req.status === 'PENDING' ? `${it.requestedQuantity} ${it.unit}` : `${it.issuedQuantity}/${it.requestedQuantity} ${it.unit}`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {req.notes && (
                    <p className="text-xs text-slate-500 mt-2 italic line-clamp-1">
                      Note: "{req.notes}"
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  {req.status === 'PENDING' ? (
                    <button
                      type="button"
                      onClick={() => onIssueClick(req)}
                      disabled={loading}
                      className="btn-glass-green w-full py-2.5 rounded-xl text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Issue Stock (Storekeeper)</span>
                    </button>
                  ) : (
                    <div className="text-center py-1 text-xs text-emerald-700 font-semibold font-mono">
                      Fulfilled {req.issuedAt ? new Date(req.issuedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
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
