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
    <div className="h-full flex flex-col bg-slate-50 text-slate-900">
      {/* Top Segment Mode Switcher */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>Hotel Inventory & Raw Material Center</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live FEFO Tracking
              </span>
            </h2>
            <p className="text-[11px] text-slate-600">
              Manage live raw ingredients, FEFO expiry dates, kitchen indents, and periodic stock audit reconciliations.
            </p>
          </div>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-white border border-slate-200">
          <button
            type="button"
            onClick={() => setHubMode('RAW_AND_INDENTS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
 hubMode === 'RAW_AND_INDENTS'
 ? 'bg-blue-600 text-white shadow-sm'
 : 'text-slate-600 hover:text-slate-900'
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
 ? 'bg-blue-600 text-white shadow-sm'
 : 'text-slate-600 hover:text-slate-900'
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
