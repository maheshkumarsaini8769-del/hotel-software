import React from 'react';
import { IRecipeMetricsUI, IFoodWasteSummaryUI, RecipeCostingHelper } from '@spicehub/ui';

interface RecipeCostingHeaderProps {
  metrics: IRecipeMetricsUI;
  wasteSummary: IFoodWasteSummaryUI;
  activeTab: 'RECIPES' | 'WASTE_AUDIT';
  onTabChange: (tab: 'RECIPES' | 'WASTE_AUDIT') => void;
  onNewRecipeClick: () => void;
  onLogWasteClick: () => void;
  onRefreshClick: () => void;
  loading: boolean;
}

export const RecipeCostingHeader: React.FC<RecipeCostingHeaderProps> = ({
  metrics,
  wasteSummary,
  activeTab,
  onTabChange,
  onNewRecipeClick,
  onLogWasteClick,
  onRefreshClick,
  loading,
}) => {
  const avgCostHealth = RecipeCostingHelper.getCostHealthBadge(
    metrics.averageFoodCostPercentage,
    metrics.targetFoodCostPercentage
  );

  return (
    <div className="bg-[#0b0e14] border-b border-amber-500/20 px-6 py-6 text-zinc-100 shadow-xl">
      {/* Top Banner & Main Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Kitchen Recipe Costing & Food Waste Auditor
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Shift 24 • F&B Margin Guard
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Ingredient Bill of Materials (BOM), Portion Yield Auditing, Spoilage Tracking & Live Gross Margins.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-3">
          <button
            type="button"
            onClick={onRefreshClick}
            disabled={loading}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            🔄
          </button>
          <button
            type="button"
            onClick={onLogWasteClick}
            className="px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
          >
            <span>🗑️</span>
            <span>Log Food Waste</span>
          </button>
          <button
            type="button"
            onClick={onNewRecipeClick}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-2"
          >
            <span>+</span>
            <span>New Recipe BOM</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Average Food Cost % */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Average Food Cost %</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-white font-mono">
              {metrics.averageFoodCostPercentage}%
            </span>
            <span className="text-xs text-zinc-500">/ Target {metrics.targetFoodCostPercentage}%</span>
          </div>
          <div className="mt-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${avgCostHealth.badgeBg} ${avgCostHealth.badgeBorder} ${avgCostHealth.badgeText}`}>
              {avgCostHealth.label}
            </span>
          </div>
        </div>

        {/* Card 2: High Cost Alerts */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-zinc-400 uppercase font-semibold">High Cost Recipes</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-2xl font-black font-mono ${metrics.highCostRecipesCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {metrics.highCostRecipesCount}
            </span>
            <span className="text-xs text-zinc-500">of {metrics.totalRecipesCount} catalog items</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-2">
            {metrics.highCostRecipesCount > 0 ? '⚠️ Review ingredient proportions' : '✓ All within margin bounds'}
          </div>
        </div>

        {/* Card 3: Total Food Waste Loss */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Food Waste Loss ({wasteSummary.daysAudited}d)</span>
          <div className="mt-2 text-2xl font-black text-rose-400 font-mono">
            {RecipeCostingHelper.formatCurrency(wasteSummary.totalLossAmount)}
          </div>
          <span className="text-[11px] text-zinc-400 mt-2">
            {wasteSummary.totalEntriesCount} audited spoilage logs
          </span>
        </div>

        {/* Card 4: Standard Recipe Coverage */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Recipe Coverage</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-amber-400 font-mono">
              {metrics.totalRecipesCount}
            </span>
            <span className="text-xs text-zinc-500">Standard SOPs</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-medium mt-2">
            100% Chef Audited
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
        <button
          type="button"
          onClick={() => onTabChange('RECIPES')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'RECIPES'
              ? 'text-amber-400 border-amber-400 bg-amber-500/10'
              : 'text-zinc-400 border-transparent hover:text-zinc-200'
          }`}
        >
          📋 Standard Recipes & BOM ({metrics.totalRecipesCount})
        </button>
        <button
          type="button"
          onClick={() => onTabChange('WASTE_AUDIT')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
            activeTab === 'WASTE_AUDIT'
              ? 'text-rose-400 border-rose-400 bg-rose-500/10'
              : 'text-zinc-400 border-transparent hover:text-zinc-200'
          }`}
        >
          🗑️ Kitchen Spoilage & Waste Audit ({wasteSummary.totalEntriesCount})
        </button>
      </div>
    </div>
  );
};
