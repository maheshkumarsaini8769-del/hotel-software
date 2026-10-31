import React, { useState } from 'react';
import { StoreRequisitionApp } from '../store-requisition/StoreRequisitionApp';
import { InventoryAuditApp } from './InventoryAuditApp';
import { Package, ClipboardCheck, Boxes } from 'lucide-react';

interface UnifiedInventoryHubAppProps {
  authToken?: string;
  hotelId?: string;
}

export const UnifiedInventoryHubApp: React.FC<UnifiedInventoryHubAppProps> = ({
  authToken,
  hotelId,
}) => {
  const [hubMode, setHubMode] = useState<'RAW_AND_INDENTS' | 'AUDIT_DISCREPANCIES'>('RAW_AND_INDENTS');

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white">
      {/* Top Segment Mode Switcher */}
      <div className="px-6 py-3 bg-slate-950 border-b border-zinc-800 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <span>Hotel Inventory & Raw Material Center</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live FEFO Tracking
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">
              Manage live raw ingredients, FEFO expiry dates, kitchen indents, and periodic stock audit reconciliations.
            </p>
          </div>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          <button
            type="button"
            onClick={() => setHubMode('RAW_AND_INDENTS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              hubMode === 'RAW_AND_INDENTS'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Stock on Hand & Indents</span>
          </button>
          <button
            type="button"
            onClick={() => setHubMode('AUDIT_DISCREPANCIES')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              hubMode === 'AUDIT_DISCREPANCIES'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Physical Stock Audits</span>
          </button>
        </div>
      </div>

      {/* Mode Content */}
      <div className="flex-1 overflow-y-auto">
        {hubMode === 'RAW_AND_INDENTS' ? (
          <StoreRequisitionApp token={authToken} hotelId={hotelId} initialTab="FEFO_ALERTS" />
        ) : (
          <InventoryAuditApp authToken={authToken} hotelId={hotelId} />
        )}
      </div>
    </div>
  );
};
