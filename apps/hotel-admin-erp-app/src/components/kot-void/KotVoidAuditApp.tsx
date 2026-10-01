import React, { useState, useEffect, useMemo } from 'react';
import {
  KotVoidStore,
  KotVoidAuditDTO,
  KotVoidReason,
  WasteDisposition,
  KotVoidHelper,
  formatCurrency,
} from '@spicehub/ui';
import { ApiClient } from '@spicehub/api-client';
import {
  ShieldAlert,
  Trash2,
  DollarSign,
  TrendingDown,
  Lock,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';
import { VoidAuditLogTable } from './VoidAuditLogTable';
import { ManagerPinVoidModal } from './ManagerPinVoidModal';

export interface KotVoidAuditAppProps {
  store?: KotVoidStore;
  apiClient?: ApiClient;
  hotelId?: string;
}

export const KotVoidAuditApp: React.FC<KotVoidAuditAppProps> = ({
  store,
  apiClient,
  hotelId = 'tenant-1',
}) => {
  const effectiveStore = useMemo(() => store || KotVoidStore.getInstance(), [store]);
  const client = useMemo(() => apiClient || new ApiClient({ baseUrl: window.location.origin, hotelId }), [apiClient, hotelId]);

  const [logs, setLogs] = useState<KotVoidAuditDTO[]>(effectiveStore.getAuditLogs());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = effectiveStore.subscribe(() => {
      setLogs(effectiveStore.getAuditLogs());
    });

    // Seed sample initial logs if empty
    if (effectiveStore.getAuditLogs().length === 0) {
      effectiveStore.setAuditLogs([
        {
          id: 'void-sample-1',
          hotelId,
          orderId: 'ord-101',
          orderNumber: 'KOT #101',
          tableNumber: 'Table 4',
          itemId: 'itm-1',
          menuItemId: 'mi-1',
          itemName: 'Paneer Tikka Angara',
          quantity: 1,
          unitPrice: 320,
          totalVoidAmount: 320,
          voidReason: KotVoidReason.CUSTOMER_CANCELLED,
          wasteDisposition: WasteDisposition.CANCELLED_BEFORE_COOKING,
          authorizedByManagerUserId: 'mgr-1',
          managerName: 'Vikram Singh (Manager)',
          waiterName: 'Ramesh Kumar',
          kitchenNotified: true,
          notes: 'Guest ordered soup instead before chef started tandoor',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'void-sample-2',
          hotelId,
          orderId: 'ord-102',
          orderNumber: 'KOT #102',
          tableNumber: 'Table 2',
          itemId: 'itm-4',
          menuItemId: 'mi-4',
          itemName: 'Butter Chicken Aslam Style',
          quantity: 1,
          unitPrice: 420,
          totalVoidAmount: 420,
          voidReason: KotVoidReason.QUALITY_REJECTED,
          wasteDisposition: WasteDisposition.WASTED_SCRAPPED,
          authorizedByManagerUserId: 'mgr-1',
          managerName: 'Vikram Singh (Manager)',
          waiterName: 'Suresh Patil',
          kitchenNotified: true,
          notes: 'Guest found gravy too spicy, replaced with mild butter chicken',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ]);
    }

    return () => unsub();
  }, [effectiveStore, hotelId]);

  const kpis = useMemo(() => {
    return KotVoidHelper.calculateVoidWasteCost(logs);
  }, [logs]);

  const handleAuthorizeVoid = async (payload: {
    managerPin: string;
    voidReason: KotVoidReason;
    wasteDisposition: WasteDisposition;
    notes?: string;
  }) => {
    setIsSubmitting(true);
    setModalErr(null);

    try {
      // In production calls live backend endpoint:
      // await client.kotVoid.voidItem({ ... })
      const newAudit: KotVoidAuditDTO = {
        id: `void-${Date.now()}`,
        hotelId,
        orderId: 'ord-101',
        orderNumber: 'KOT #101',
        tableNumber: 'Table 4',
        itemId: `itm-${Date.now()}`,
        menuItemId: 'mi-101',
        itemName: 'Butter Garlic Naan',
        quantity: 2,
        unitPrice: 60,
        totalVoidAmount: 120,
        voidReason: payload.voidReason,
        wasteDisposition: payload.wasteDisposition,
        authorizedByManagerUserId: 'mgr-active',
        managerName: 'Admin / Manager Verified',
        kitchenNotified: true,
        notes: payload.notes,
        createdAt: new Date().toISOString(),
      };

      effectiveStore.addAuditLog(newAudit);
      setIsModalOpen(false);
    } catch (err: any) {
      setModalErr(err.message || 'Failed to void item with provided Manager PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">
                KOT Lock & Manager Security PIN Void Control
              </h1>
              <p className="text-xs text-slate-400">
                Shift 50: Anti-Theft Protection, Item Deletion Lock & Real-time Kitchen Food Waste Auditor
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-rose-600/30"
          >
            <Lock className="w-4 h-4" /> Authorize KOT Void (Test Modal)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Void Events</span>
            <ShieldAlert className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-mono">{logs.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Authorized cancellations</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Void Value</span>
            <DollarSign className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-400 font-mono">
              {formatCurrency(kpis.totalVoidAmount)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Total revenue removed</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-rose-500/30 bg-rose-500/5 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-300 text-xs font-semibold">
            <span>Kitchen Scrap (Wasted Food)</span>
            <Trash2 className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-400 font-mono">
              {formatCurrency(kpis.scrappedWasteCost)}
            </div>
            <div className="text-[11px] text-rose-300/70 mt-1">Direct inventory loss to hotel</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold">
            <span>Pre-Cook Savings / Reused</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {formatCurrency(kpis.reusableSavedValue)}
            </div>
            <div className="text-[11px] text-emerald-300/70 mt-1">Food saved from kitchen scrap</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <VoidAuditLogTable logs={logs} />

      {/* Manager PIN Authorization Modal */}
      <ManagerPinVoidModal
        isOpen={isModalOpen}
        orderNumber="KOT #101"
        tableNumber="Table 4"
        itemName="Butter Garlic Naan"
        itemPrice={60}
        quantity={2}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAuthorizeVoid}
        isLoading={isSubmitting}
        errorMessage={modalErr}
      />
    </div>
  );
};
