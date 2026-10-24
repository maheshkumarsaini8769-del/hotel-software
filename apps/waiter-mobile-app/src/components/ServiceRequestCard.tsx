import React from 'react';
import { RequestType } from '@spicehub/shared-types';
import { WaiterServiceRequestModel, WaiterRequestLifecycle } from '@spicehub/ui';
import { Droplets, Utensils, Receipt, Bell, Sparkles, HelpCircle } from 'lucide-react';

export interface ServiceRequestCardProps {
  request: WaiterServiceRequestModel;
  onAccept: (requestId: string) => void | Promise<void>;
  onComplete: (requestId: string) => void | Promise<void>;
}

const RequestTypeIconMap: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; bg: string; color: string }> = {
  [RequestType.WATER]: { icon: Droplets, label: 'Water Request', bg: 'bg-blue-500/10 border-blue-500/30', color: 'text-blue-400' },
  [RequestType.CUTLERY]: { icon: Utensils, label: 'Cutlery Needed', bg: 'bg-emerald-500/10 border-emerald-500/30', color: 'text-emerald-400' },
  [RequestType.BILL]: { icon: Receipt, label: 'Bill / Settle', bg: 'bg-amber-500/10 border-amber-500/30', color: 'text-amber-400' },
  [RequestType.CALL_WAITER]: { icon: Bell, label: 'Call Waiter', bg: 'bg-purple-500/10 border-purple-500/30', color: 'text-purple-400' },
  [RequestType.CLEANING]: { icon: Sparkles, label: 'Table Cleaning', bg: 'bg-orange-500/10 border-orange-500/30', color: 'text-orange-400' },
};

export const ServiceRequestCard: React.FC<ServiceRequestCardProps> = ({
  request,
  onAccept,
  onComplete,
}) => {
  const rawType = ((request as any).type || request.requestType || 'CALL_WAITER').toUpperCase();
  const typeMeta = RequestTypeIconMap[rawType] || {
    icon: Bell,
    label: rawType.replace(/_/g, ' '),
    bg: 'bg-purple-950/60 border-purple-700/60',
    color: 'text-purple-300',
  };
  const IconComponent = typeMeta.icon;

  const tableStr = String(request.tableNumber || (request as any).table || '4');
  const displayTable = tableStr.toLowerCase().startsWith('table') ? tableStr : `Table ${tableStr}`;

  const isAccepted = request.status === WaiterRequestLifecycle.ACCEPTED;
  const isPending =
    request.status === WaiterRequestLifecycle.PENDING ||
    request.status === WaiterRequestLifecycle.ASSIGNED ||
    !request.status;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-200 shadow-md ${
        isPending
          ? 'border-amber-500/70 bg-gradient-to-br from-amber-950/40 to-slate-900 shadow-amber-950/30'
          : 'border-slate-800 bg-slate-900 shadow-sm'
      }`}
      data-testid={`request-card-${request.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2.5">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${typeMeta.bg}`}>
            <IconComponent className={`w-4 h-4 ${typeMeta.color}`} />
          </div>
          <div>
            <div className="font-extrabold text-sm text-white">
              {typeMeta.label}
            </div>
            <div className="text-xs font-semibold text-amber-400">
              {displayTable}
              {request.section && ` • ${request.section}`}
            </div>
          </div>
        </div>

        <span
          className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border ${typeMeta.bg}`}
        >
          {request.status || 'PENDING'}
        </span>
      </div>

      {request.notes && (
        <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 p-2 rounded mb-3 italic">
          "{request.notes}"
        </div>
      )}

      {/* 1-Tap Action Buttons */}
      <div className="mt-3 flex items-center space-x-2">
        {isPending && (
          <button
            onClick={() => onAccept(request.id)}
            className="flex-1 py-2 px-3 bg-primary-600 hover:bg-primary-700 text-white font-medium text-xs rounded-lg shadow-sm transition active:scale-95 text-center"
          >
            ✋ 1-Tap Acknowledge
          </button>
        )}

        {isAccepted && (
          <button
            onClick={() => onComplete(request.id)}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-sm transition active:scale-95 text-center"
          >
            ✅ 1-Tap Fulfill
          </button>
        )}
      </div>
    </div>
  );
};
