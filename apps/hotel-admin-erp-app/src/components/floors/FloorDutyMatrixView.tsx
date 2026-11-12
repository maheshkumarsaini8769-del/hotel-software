import { FloorOverviewSummaryDTO, FloorDutyHelper } from '@spicehub/ui';
import { Building2, RefreshCw, AlertTriangle, CheckCircle2, Sliders, Users } from 'lucide-react';

export interface FloorDutyState extends Partial<FloorOverviewSummaryDTO> {
  floorCode: string;
  floorName: string;
  totalOccupiedPax?: number;
  totalCapacityPax?: number;
  activeWaitersCount?: number;
  overloadedWaitersCount?: number;
  [key: string]: any;
}

interface FloorDutyMatrixViewProps {
  floors: FloorDutyState[];
  onAssignRange?: (floorCode: string) => void;
  onRefresh?: () => void;
}

export const FloorDutyMatrixView: React.FC<FloorDutyMatrixViewProps> = ({
  floors,
  onAssignRange,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Multi-Floor Waiter Duty Matrix
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Live floor workloads, table range assignments, and overload safety alerts
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn-glass-green flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-xs active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Floors</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {floors.map((floor) => {
          const colors = FloorDutyHelper.getFloorBadgeColor(floor.floorCode);
          const rawUtilization = FloorDutyHelper.getFloorUtilization(floor as any);
          const utilizationPct = typeof rawUtilization === 'number' ? rawUtilization : (rawUtilization as any)?.percentage || 0;
          const statusColor = utilizationPct > 90 ? '#ef4444' : utilizationPct > 75 ? '#f59e0b' : '#10b981';
          const hasOverload = (floor.overloadedWaitersCount || 0) > 0;

          return (
            <div
              key={floor.floorCode}
              className={`rounded-2xl p-5 border flex flex-col justify-between transition-all shadow-xs ${
                hasOverload
                  ? 'bg-rose-50/40 border-rose-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {floor.floorName} ({floor.floorCode})
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">{floor.activeWaitersCount}</span> On Duty
                  </div>
                </div>

                {/* Utilization Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span>Floor Pax Capacity:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {floor.totalOccupiedPax} / {floor.totalCapacityPax} Pax ({utilizationPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, utilizationPct)}%`,
                        backgroundColor: statusColor,
                      }}
                    />
                  </div>
                </div>

                {/* Overload Alert */}
                {hasOverload && (
                  <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Overload Alert: {floor.overloadedWaiters[0].waiterName} assigned{' '}
                      {floor.overloadedWaiters[0].paxCapacity} pax (Cap: {floor.overloadedWaiters[0].cap})!
                    </span>
                  </div>
                )}

                {/* Unassigned Tables Notice */}
                <div className="mt-3">
                  {floor.unassignedTablesCount > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {floor.unassignedTablesCount} Unassigned Tables ({floor.unassignedTables.slice(0, 4).join(', ')}...)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>All Tables Fully Covered</span>
                    </div>
                  )}
                </div>
              </div>

              {onAssignRange && (
                <button
                  onClick={() => onAssignRange(floor.floorCode)}
                  className="btn-glass-green-subtle mt-4 w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Dynamic Range Assigner</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
