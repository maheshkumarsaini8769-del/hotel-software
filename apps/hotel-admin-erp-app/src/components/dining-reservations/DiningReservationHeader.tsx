import React from 'react';
import { IDiningReservationMetricsUI, MealPeriodUI } from '@spicehub/ui';
import { UtensilsCrossed, RefreshCw, Plus } from 'lucide-react';

interface DiningReservationHeaderProps {
  metrics: IDiningReservationMetricsUI;
  selectedMealPeriod: MealPeriodUI | 'ALL';
  onMealPeriodChange: (period: MealPeriodUI | 'ALL') => void;
  onNewReservationClick: () => void;
  onRefreshClick: () => void;
  loading: boolean;
}

export const DiningReservationHeader: React.FC<DiningReservationHeaderProps> = ({
  metrics,
  selectedMealPeriod,
  onMealPeriodChange,
  onNewReservationClick,
  onRefreshClick,
  loading,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-6 text-slate-900 shadow-xs">
      {/* Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs">
              <UtensilsCrossed className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Table Reservations & Dietary CRM
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  VIP CRM Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                VIP Dining Tiers, Strict Kitchen Allergen Alerts, Table Preference Assignment & Meal Period Flow.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <button
            type="button"
            onClick={onRefreshClick}
            disabled={loading}
            className="btn-glass-green-subtle p-2.5 rounded-xl text-emerald-800 text-xs transition-all disabled:opacity-50 flex items-center justify-center"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onNewReservationClick}
            className="btn-glass-green px-4 py-2.5 rounded-xl text-white font-semibold text-xs tracking-wider transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New VIP Dining Booking</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Bookings</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.totalReservationsCount}</span>
            <span className="text-[10px] text-slate-400">Today</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Confirmed Expected</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-blue-600">{metrics.confirmedCount}</span>
            <span className="text-[10px] text-slate-400">Pending arrival</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Seated & Dining</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600">{metrics.seatedCount}</span>
            <span className="text-[10px] text-slate-400">In restaurant</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">VIP Guests</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-600">{metrics.vipCount}</span>
            <span className="text-[10px] text-slate-400">Gold & Platinum</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Allergen Warnings</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-rose-600">{metrics.allergenAlertsCount}</span>
            <span className="text-[10px] text-slate-400">Kitchen Alert Active</span>
          </div>
        </div>
      </div>

      {/* Meal Period Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap border-b border-slate-200 pb-0 text-xs">
        {[
          { id: 'ALL', label: 'All Services' },
          { id: 'LUNCH', label: 'Lunch Service' },
          { id: 'DINNER', label: 'Dinner Service' },
          { id: 'HIGH_TEA', label: 'High Tea' },
          { id: 'BREAKFAST', label: 'Breakfast' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onMealPeriodChange(tab.id as any)}
            className={`px-3.5 py-2 font-bold tracking-wider border-b-2 transition-all ${
              selectedMealPeriod === tab.id
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};
