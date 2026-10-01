import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  IInventoryAuditSessionUI,
  IAuditMetricsUI,
  INewAuditSessionPayload,
  ISubmitCountsPayload,
  IReconcilePayload,
  InventoryAuditStore,
} from '@spicehub/ui';
import { InventoryAuditHeader } from './InventoryAuditHeader';
import { AuditSessionCardList } from './AuditSessionCardList';
import { DiscrepancyVarianceTable } from './DiscrepancyVarianceTable';
import { NewAuditSessionModal } from './NewAuditSessionModal';
import { BlindStocktakeSheetModal } from './BlindStocktakeSheetModal';
import { ReconciliationModal } from './ReconciliationModal';

interface InventoryAuditAppProps {
  apiBaseUrl?: string;
  authToken?: string;
  hotelId?: string;
}

export const InventoryAuditApp: React.FC<InventoryAuditAppProps> = ({
  apiBaseUrl = 'http://localhost:5000/api/v1',
  authToken,
  hotelId,
}) => {
  const store = useMemo(() => new InventoryAuditStore(), []);
  const [state, setState] = useState(store.getState());

  const [activeTab, setActiveTab] = useState<'SESSIONS' | 'BLIND_ENTRY' | 'RECONCILE'>('SESSIONS');
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [modalSession, setModalSession] = useState<IInventoryAuditSessionUI | null>(null);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, [store]);

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (hotelId) headers['x-hotel-id'] = hotelId;
    return headers;
  }, [authToken, hotelId]);

  const fetchSessions = async () => {
    store.setLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/inventory-audits/sessions`, {
        headers: authHeaders,
        params: {
          status: statusFilter,
          location: locationFilter,
        },
      });

      if (res.data.success) {
        store.setSessions(res.data.sessions || []);
        store.setMetrics(
          res.data.metrics || {
            totalAuditsCount: 0,
            openAuditsCount: 0,
            totalNetShortageLoss: 0,
            reconciledCount: 0,
          }
        );
        if (!state.selectedSession && res.data.sessions?.length > 0) {
          store.setSelectedSession(res.data.sessions[0]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching inventory audit sessions:', err);
      store.setError(err.response?.data?.message || err.message);
    } finally {
      store.setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [statusFilter, locationFilter]);

  const handleCreateSession = async (payload: INewAuditSessionPayload) => {
    store.setLoading(true);
    try {
      const res = await axios.post(`${apiBaseUrl}/inventory-audits/sessions`, payload, {
        headers: authHeaders,
      });
      if (res.data.success && res.data.session) {
        store.addSession(res.data.session);
        store.setSelectedSession(res.data.session);
        fetchSessions();
      }
    } catch (err: any) {
      console.error('Error creating audit session:', err);
      alert(err.response?.data?.message || 'Failed to initiate audit session');
    } finally {
      store.setLoading(false);
    }
  };

  const handleSubmitCounts = async (auditId: string, payload: ISubmitCountsPayload) => {
    store.setLoading(true);
    try {
      const res = await axios.post(
        `${apiBaseUrl}/inventory-audits/sessions/${auditId}/count`,
        payload,
        { headers: authHeaders }
      );
      if (res.data.success && res.data.session) {
        store.updateSession(res.data.session);
        fetchSessions();
      }
    } catch (err: any) {
      console.error('Error submitting physical counts:', err);
      alert(err.response?.data?.message || 'Failed to submit physical counts');
    } finally {
      store.setLoading(false);
    }
  };

  const handleReconcile = async (auditId: string, payload: IReconcilePayload) => {
    store.setLoading(true);
    try {
      const res = await axios.patch(
        `${apiBaseUrl}/inventory-audits/sessions/${auditId}/reconcile`,
        payload,
        { headers: authHeaders }
      );
      if (res.data.success && res.data.session) {
        store.updateSession(res.data.session);
        fetchSessions();
      }
    } catch (err: any) {
      console.error('Error reconciling discrepancies:', err);
      alert(err.response?.data?.message || 'Failed to reconcile audit session');
    } finally {
      store.setLoading(false);
    }
  };

  // Locations list for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locSet = new Set<string>();
    state.sessions.forEach((s) => {
      if (s.storeLocation) locSet.add(s.storeLocation);
    });
    return Array.from(locSet);
  }, [state.sessions]);

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100 flex flex-col font-sans">
      {/* Header with KPIs & Tab Bar */}
      <InventoryAuditHeader
        metrics={state.metrics}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewSessionClick={() => setIsNewSessionModalOpen(true)}
        onRefreshClick={fetchSessions}
        loading={state.isLoading}
      />

      {/* Main Workspace Content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Filter Bar */}
        <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="IN_PROGRESS">In Counting</option>
                <option value="SUBMITTED">Submitted (Matched)</option>
                <option value="DISCREPANCY_FLAGGED">Discrepancy Flagged</option>
                <option value="RECONCILED">Reconciled & Posted</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                Location:
              </span>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Store Locations</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-zinc-400">
            Showing <strong className="text-white">{state.sessions.length}</strong> active audit sessions
          </div>
        </div>

        {/* Tab 1: Sessions List & Detailed Items Table */}
        {activeTab === 'SESSIONS' && (
          <div className="space-y-6">
            <AuditSessionCardList
              sessions={state.sessions}
              selectedSession={state.selectedSession}
              onSelectSession={(session) => store.setSelectedSession(session)}
              onOpenCountModal={(session) => {
                setModalSession(session);
                setIsCountModalOpen(true);
              }}
              onOpenReconcileModal={(session) => {
                setModalSession(session);
                setIsReconcileModalOpen(true);
              }}
            />

            {state.selectedSession && (
              <div className="mt-8">
                <DiscrepancyVarianceTable
                  items={state.selectedSession.items || []}
                  auditNumber={state.selectedSession.auditNumber}
                  storeLocation={state.selectedSession.storeLocation}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Direct Blind Count Sheet */}
        {activeTab === 'BLIND_ENTRY' && (
          <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-300">
                  Select an In-Progress Session to Complete Shelf Counts
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Counters only view descriptions and units. System quantities remain hidden under Blind Audit settings.
                </p>
              </div>
            </div>

            <AuditSessionCardList
              sessions={state.sessions.filter((s) => s.status !== 'RECONCILED')}
              selectedSession={state.selectedSession}
              onSelectSession={(session) => store.setSelectedSession(session)}
              onOpenCountModal={(session) => {
                setModalSession(session);
                setIsCountModalOpen(true);
              }}
              onOpenReconcileModal={(session) => {
                setModalSession(session);
                setIsReconcileModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Tab 3: Discrepancy Reconciliation Board */}
        {activeTab === 'RECONCILE' && (
          <div className="space-y-6">
            <div className="bg-teal-500/10 border border-teal-500/30 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-teal-300">
                  Financial Controller Discrepancy Review Board
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Sessions where physical stock deviates from system books. Assign variance causes and post ledger adjustments.
                </p>
              </div>
            </div>

            <AuditSessionCardList
              sessions={state.sessions.filter((s) => s.status === 'DISCREPANCY_FLAGGED')}
              selectedSession={state.selectedSession}
              onSelectSession={(session) => store.setSelectedSession(session)}
              onOpenCountModal={(session) => {
                setModalSession(session);
                setIsCountModalOpen(true);
              }}
              onOpenReconcileModal={(session) => {
                setModalSession(session);
                setIsReconcileModalOpen(true);
              }}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <NewAuditSessionModal
        isOpen={isNewSessionModalOpen}
        onClose={() => setIsNewSessionModalOpen(false)}
        onSubmit={handleCreateSession}
        loading={state.isLoading}
      />

      <BlindStocktakeSheetModal
        session={modalSession}
        isOpen={isCountModalOpen}
        onClose={() => {
          setIsCountModalOpen(false);
          setModalSession(null);
        }}
        onSubmit={handleSubmitCounts}
        loading={state.isLoading}
      />

      <ReconciliationModal
        session={modalSession}
        isOpen={isReconcileModalOpen}
        onClose={() => {
          setIsReconcileModalOpen(false);
          setModalSession(null);
        }}
        onSubmit={handleReconcile}
        loading={state.isLoading}
      />
    </div>
  );
};
