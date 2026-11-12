import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';
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
import { NewStockBatchModal, INewStockBatchPayload } from './NewStockBatchModal';
import { IssueRequisitionModal } from './IssueRequisitionModal';
import { InterKitchenTransferModal } from './InterKitchenTransferModal';

interface StoreRequisitionAppProps {
  apiBaseUrl?: string;
  token?: string;
  hotelId?: string;
  initialTab?: 'REQUISITIONS' | 'TRANSFERS' | 'FEFO_ALERTS';
}

export const StoreRequisitionApp: React.FC<StoreRequisitionAppProps> = ({
  apiBaseUrl = API_BASE_URL,
  token,
  hotelId,
  initialTab = 'FEFO_ALERTS',
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
  const [activeTab, setActiveTab] = useState<'REQUISITIONS' | 'TRANSFERS' | 'FEFO_ALERTS'>(initialTab);
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
    ...(hotelId ? { 'x-hotel-id': hotelId } : {}),
  }), [token, hotelId]);

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

  // Create Stock Batch (FEFO intake)
  const handleSaveBatch = async (payload: INewStockBatchPayload) => {
    try {
      store.setLoading(true);
      const res = await fetch(`${apiBaseUrl}/store-requisitions/batches`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || `Batch intake failed (HTTP ${res.status})`);
      }
      await fetchBatches();
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

  const closeModal = useCallback(() => {
    store.setActiveModal(null);
    setActiveModal(null);
  }, [store]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none">
      {/* Header */}
      <StoreRequisitionHeader
        metrics={metrics}
        fefoMetrics={fefoMetrics}
        activeTab={activeTab}
        onTabChange={(tab) => {
          store.setActiveTab(tab);
          setActiveTab(tab);
        }}
        onNewRequisitionClick={() => {
          store.setActiveModal('NEW_REQ');
          setActiveModal('NEW_REQ');
        }}
        onNewTransferClick={() => {
          store.setActiveModal('NEW_TRANSFER');
          setActiveModal('NEW_TRANSFER');
        }}
        onNewBatchClick={() => {
          store.setActiveModal('NEW_BATCH');
          setActiveModal('NEW_BATCH');
        }}
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
              setActiveModal('ISSUE_REQ');
            }}
            loading={loading}
          />
        )}

        {activeTab === 'TRANSFERS' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">Inter-Kitchen Stock Transfers</h2>
                <p className="text-xs text-slate-500">Track sauce/prep dispatch and receiving between outlets</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  store.setActiveModal('NEW_TRANSFER');
                  setActiveModal('NEW_TRANSFER');
                }}
                className="btn-glass-green px-4 py-2 rounded-xl font-bold text-xs cursor-pointer"
              >
                + Dispatch Transfer
              </button>
            </div>
            <div className="py-12 text-center text-slate-400 text-xs">
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

      {/* Exclusive Modal Stack: Only one modal can mount and render at a time */}
      {activeModal === 'NEW_REQ' && (
        <NewRequisitionModal
          isOpen={true}
          onClose={closeModal}
          onSave={handleSaveRequisition}
          loading={loading}
        />
      )}

      {activeModal === 'ISSUE_REQ' && (
        <IssueRequisitionModal
          isOpen={true}
          requisition={selectedReq}
          onClose={closeModal}
          onSave={handleIssueRequisition}
          loading={loading}
        />
      )}

      {activeModal === 'NEW_TRANSFER' && (
        <InterKitchenTransferModal
          isOpen={true}
          onClose={closeModal}
          onSave={handleSaveTransfer}
          loading={loading}
        />
      )}

      {activeModal === 'NEW_BATCH' && (
        <NewStockBatchModal
          isOpen={true}
          onClose={closeModal}
          onSave={handleSaveBatch}
          loading={loading}
        />
      )}
    </div>
  );
};
