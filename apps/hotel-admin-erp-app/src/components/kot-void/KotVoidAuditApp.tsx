import React, { useState, useEffect, useMemo } from 'react';
import {
  KotVoidStore,
  KotVoidAuditDTO,
  KotVoidHelper,
  formatCurrency,
} from '@spicehub/ui';
import { ApiClient } from '@spicehub/api-client';
import { ShieldAlert, Trash2, DollarSign, TrendingDown } from 'lucide-react';
import { VoidAuditLogTable } from './VoidAuditLogTable';
import { getApiClient } from '../../lib/apiClient';
import { getStoredHotelId } from '../../config/api';

export interface KotVoidAuditAppProps {
  store?: KotVoidStore;
  apiClient?: ApiClient;
  hotelId?: string;
}

export const KotVoidAuditApp: React.FC<KotVoidAuditAppProps> = ({
  store,
  apiClient,
  hotelId = getStoredHotelId(),
}) => {
  const effectiveStore = useMemo(() => store || KotVoidStore.getInstance(), [store]);
  const client = useMemo(() => apiClient || getApiClient(), [apiClient]);

  const [logs, setLogs] = useState<KotVoidAuditDTO[]>(effectiveStore.getAuditLogs());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = effectiveStore.subscribe(() => {
      setLogs(effectiveStore.getAuditLogs());
    });

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    client.kotVoid
      .getAuditLogs({ limit: 200 })
      .then((res) => {
        if (cancelled) return;
        if (res.success && Array.isArray(res.logs)) {
          effectiveStore.setAuditLogs(res.logs);
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        setLoadError(err?.message || 'Could not load live KOT void audit logs.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [effectiveStore, client, hotelId]);

  const kpis = useMemo(() => {
    return KotVoidHelper.calculateVoidWasteCost(logs);
  }, [logs]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6 rounded-2xl border border-slate-200 text-slate-900 shadow-xs">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                KOT Lock & Manager Security PIN Void Control
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Shift 50: Anti-Theft Protection, Item Deletion Lock & Real-time Kitchen Food Waste Auditor
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              loading ? 'animate-pulse bg-amber-500' : loadError ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          />
          {loading ? 'Syncing live audit log…' : loadError ? 'Live sync unavailable' : 'Live audit log'}
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {loadError} Void authorization remains available from the live KOT card in
          Kitchen KDS.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Void Events</span>
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 font-mono">{logs.length}</div>
            <div className="text-xs text-slate-400 mt-1">Authorized cancellations</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Void Value</span>
            <DollarSign className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600 font-mono">
              {formatCurrency(kpis.totalVoidAmount)}
            </div>
            <div className="text-xs text-slate-400 mt-1">Total revenue removed</div>
          </div>
        </div>

        <div className="bg-white border border-rose-200 bg-rose-50/30 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold">
            <span>Kitchen Scrap (Wasted Food)</span>
            <Trash2 className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600 font-mono">
              {formatCurrency(kpis.scrappedWasteCost)}
            </div>
            <div className="text-xs text-rose-600/70 mt-1">Direct inventory loss to hotel</div>
          </div>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/30 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span>Pre-Cook Savings / Reused</span>
            <TrendingDown className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700 font-mono">
              {formatCurrency(kpis.reusableSavedValue)}
            </div>
            <div className="text-xs text-emerald-700/70 mt-1">Food saved from kitchen scrap</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <VoidAuditLogTable logs={logs} />
    </div>
  );
};
