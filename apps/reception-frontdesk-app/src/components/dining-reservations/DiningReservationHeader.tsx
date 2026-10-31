import React from 'react';
import { IDiningReservationMetricsUI, MealPeriodUI } from '@spicehub/ui';

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
    <div className="bg-slate-950 border-b border-red-500/20 px-6 py-6 text-zinc-100 shadow-xl">
      {/* Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-sm dark:shadow-none" />
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Restaurant Table Reservation CRM & Guest Dietary Allergens
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
              Shift 30 • VIP CRM & Allergens
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            VIP Dining Tiers, Strict Kitchen Allergen Alerts, Table Preference Assignment & Meal Period Flow.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <button
            type="button"
            onClick={onRefreshClick}
            disabled={loading}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition-all disabled:opacity-50"
            title="Refresh"
          >
            🔄
          </button>
          <button
            type="button"
            onClick={onNewReservationClick}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-sm transition-all flex items-center gap-2"
          >
            <span>+</span> New VIP Dining Booking
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Bookings</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{metrics.totalReservationsCount}</span>
            <span className="text-[10px] text-zinc-500">Today</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-blue-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Confirmed Expected</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-blue-400">{metrics.confirmedCount}</span>
            <span className="text-[10px] text-blue-500/80">Pending arrival</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-emerald-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Seated & Dining</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-400">{metrics.seatedCount}</span>
            <span className="text-[10px] text-emerald-500/80">In restaurant</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">VIP Guests</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-700 dark:text-slate-300">{metrics.vipCount}</span>
            <span className="text-[10px] text-slate-700 dark:text-slate-300/80">Gold & Platinum</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-red-500/40 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Allergen Warnings</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-red-400">{metrics.allergenAlertsCount}</span>
            <span className="text-[10px] text-red-500/80">Kitchen Alert Active</span>
          </div>
        </div>
      </div>

      {/* Meal Period Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap border-b border-zinc-800 pb-0 text-xs">
        {[
          { id: 'ALL', label: 'All Services' },
          { id: 'LUNCH', label: '☀️ Lunch Service' },
          { id: 'DINNER', label: '🌙 Dinner Service' },
          { id: 'HIGH_TEA', label: '☕ High Tea' },
          { id: 'BREAKFAST', label: '🥐 Breakfast' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onMealPeriodChange(tab.id as any)}
            className={`px-3.5 py-2 font-bold uppercase tracking-wider border-b-2 transition-all ${
              selectedMealPeriod === tab.id
                ? 'border-red-400 text-red-400 bg-red-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};
