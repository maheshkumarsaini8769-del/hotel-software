import React, { useState, useEffect, useCallback } from 'react';
import {
  StoreRequisitionStore,
  IStoreRequisitionUI,
  IStockTransferUI,
  IStockBatchUI,
  IRequisitionMetricsUI,
  IFefoMetricsUI,
  INewRequisitionPayload,
  IIssueRequisitionPayload,
  INewTransferPayload,
  RequisitionStatusUI,
  RequisitionDepartmentUI,
} from '@spicehub/ui';
import { StoreRequisitionHeader } from './StoreRequisitionHeader';
import { RequisitionCardList } from './RequisitionCardList';
import { FefoBatchAlertBoard } from './FefoBatchAlertBoard';
import { NewRequisitionModal } from './NewRequisitionModal';
import { IssueRequisitionModal } from './IssueRequisitionModal';
import { InterKitchenTransferModal } from './InterKitchenTransferModal';

interface StoreRequisitionAppProps {
  apiBaseUrl?: string;
  token?: string;
}

export const StoreRequisitionApp: React.FC<StoreRequisitionAppProps> = ({
  apiBaseUrl = 'http://localhost:5000/api/v1',
  token,
}) => {
  const [store] = useState(() => new StoreRequisitionStore());
  const [requisitions, setRequisitions] = useState<IStoreRequisitionUI[]>([]);
  const [selectedReq, setSelectedReq] = useState<IStoreRequisitionUI | null>(null);
  const [transfers, setTransfers] = useState<IStockTransferUI[]>([]);
  const [batches, setBatches] = useState<IStockBatchUI[]>([]);
  const [metrics, setMetrics] = useState<IRequisitionMetricsUI>({
    totalPendingCount: 0,
    criticalCount: 0,
    fulfilledTodayCount: 0,
    totalCount: 0,
  });
  const [fefoMetrics, setFefoMetrics] = useState<IFefoMetricsUI>({
    totalBatchesCount: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
    totalAtRiskValue: 0,
  });
  const [activeTab, setActiveTab] = useState<'REQUISITIONS' | 'TRANSFERS' | 'FEFO_ALERTS'>('REQUISITIONS');
  const [filterStatus, setFilterStatus] = useState<RequisitionStatusUI | 'ALL'>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<RequisitionDepartmentUI | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<'NEW_REQ' | 'ISSUE_REQ' | 'NEW_TRANSFER' | 'NEW_BATCH' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = store.subscribe((state) => {
      setRequisitions(state.requisitions);
      setSelectedReq(state.selectedRequisition);
      setTransfers(state.transfers);
      setBatches(state.batches);
      setMetrics(state.metrics);
      setFefoMetrics(state.fefoMetrics);
      setActiveTab(state.activeTab);
      setFilterStatus(state.filterStatus);
      setFilterDepartment(state.filterDepartment);
      setSearchQuery(state.searchQuery);
      setActiveModal(state.activeModal);
      setLoading(state.loading);
    });
    return unsub;
  }, [store]);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  // Fetch Requisitions
  const fetchRequisitions = useCallback(async () => {
    try {
      store.setLoading(true);
      const res = await fetch(`${apiBaseUrl}/store-requisitions/requisitions`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        store.setRequisitions(data.requisitions, data.metrics);
      }
    } catch {
      // Fallback
    } finally {
      store.setLoading(false);
    }
  }, [apiBaseUrl, authHeaders, store]);

  // Fetch FEFO Batches
  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/store-requisitions/batches`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        store.setBatches(data.batches, data.fefoMetrics);
      }
    } catch {
      // Fallback
    }
  }, [apiBaseUrl, authHeaders, store]);

  useEffect(() => {
    fetchRequisitions();
    fetchBatches();
  }, [fetchRequisitions, fetchBatches]);

  // Create Requisition
  const handleSaveRequisition = async (payload: INewRequisitionPayload) => {
    try {
      store.setLoading(true);
      const res = await fetch(`${apiBaseUrl}/store-requisitions/requisitions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        store.setActiveModal(null);
        fetchRequisitions();
      }
    } catch {
      store.setActiveModal(null);
    } finally {
      store.setLoading(false);
    }
  };

  // Issue Stock
  const handleIssueRequisition = async (payload: IIssueRequisitionPayload) => {
    if (!selectedReq) return;
    try {
      store.setLoading(true);
      const res = await fetch(`${apiBaseUrl}/store-requisitions/requisitions/${selectedReq._id}/issue`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        store.setActiveModal(null);
        fetchRequisitions();
      }
    } catch {
      store.setActiveModal(null);
    } finally {
      store.setLoading(false);
    }
  };

  // Create Transfer
  const handleSaveTransfer = async (payload: INewTransferPayload) => {
    try {
      store.setLoading(true);
      await fetch(`${apiBaseUrl}/store-requisitions/transfers`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      store.setActiveModal(null);
    } catch {
      store.setActiveModal(null);
    } finally {
      store.setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col font-sans select-none">
      {/* Header */}
      <StoreRequisitionHeader
        metrics={metrics}
        fefoMetrics={fefoMetrics}
        activeTab={activeTab}
        onTabChange={(tab) => store.setActiveTab(tab)}
        onNewRequisitionClick={() => store.setActiveModal('NEW_REQ')}
        onNewTransferClick={() => store.setActiveModal('NEW_TRANSFER')}
        onNewBatchClick={() => store.setActiveModal('NEW_BATCH')}
        onRefreshClick={() => {
          fetchRequisitions();
          fetchBatches();
        }}
        loading={loading}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 p-6 max-w-[1700px] w-full mx-auto">
        {activeTab === 'REQUISITIONS' && (
          <RequisitionCardList
            requisitions={requisitions}
            selectedStatus={filterStatus}
            onStatusChange={(status) => store.setFilterStatus(status)}
            selectedDepartment={filterDepartment}
            onDepartmentChange={(dept) => store.setFilterDepartment(dept)}
            searchQuery={searchQuery}
            onSearchChange={(q) => store.setSearchQuery(q)}
            onIssueClick={(req) => {
              store.setSelectedRequisition(req);
              store.setActiveModal('ISSUE_REQ');
            }}
            loading={loading}
          />
        )}

        {activeTab === 'TRANSFERS' && (
          <div className="bg-[#0f131a] rounded-2xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-white">Inter-Kitchen Stock Transfers</h2>
                <p className="text-xs text-zinc-400">Track sauce/prep dispatch and receiving between outlets</p>
              </div>
              <button
                type="button"
                onClick={() => store.setActiveModal('NEW_TRANSFER')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase"
              >
                + Dispatch Transfer
              </button>
            </div>
            <div className="py-12 text-center text-zinc-500 text-xs">
              No active in-transit stock movements currently recorded
            </div>
          </div>
        )}

        {activeTab === 'FEFO_ALERTS' && (
          <FefoBatchAlertBoard
            batches={batches}
            fefoMetrics={fefoMetrics}
            loading={loading}
          />
        )}
      </div>

      {/* New Requisition Modal */}
      <NewRequisitionModal
        isOpen={activeModal === 'NEW_REQ'}
        onClose={() => store.setActiveModal(null)}
        onSave={handleSaveRequisition}
        loading={loading}
      />

      {/* Issue Stock Modal */}
      <IssueRequisitionModal
        isOpen={activeModal === 'ISSUE_REQ'}
        requisition={selectedReq}
        onClose={() => store.setActiveModal(null)}
        onSave={handleIssueRequisition}
        loading={loading}
      />

      {/* Inter-Kitchen Transfer Modal */}
      <InterKitchenTransferModal
        isOpen={activeModal === 'NEW_TRANSFER'}
        onClose={() => store.setActiveModal(null)}
        onSave={handleSaveTransfer}
        loading={loading}
      />
    </div>
  );
};
