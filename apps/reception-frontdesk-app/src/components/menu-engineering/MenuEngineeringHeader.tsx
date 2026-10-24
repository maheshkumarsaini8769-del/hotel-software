import React from 'react';
import { IMenuEngineeringReportUI, MenuEngineeringHelper } from '@spicehub/ui';

interface MenuEngineeringHeaderProps {
  report: IMenuEngineeringReportUI | null;
  activeTab: 'MATRIX' | 'TABLE' | 'SIMULATOR';
  onTabChange: (tab: 'MATRIX' | 'TABLE' | 'SIMULATOR') => void;
  onGenerateReport: () => void;
  onOpenSimulator: () => void;
  loading: boolean;
}

export const MenuEngineeringHeader: React.FC<MenuEngineeringHeaderProps> = ({
  report,
  activeTab,
  onTabChange,
  onGenerateReport,
  onOpenSimulator,
  loading,
}) => {
  const summary = report?.summaryCounts || {
    starsCount: 0,
    plowhorsesCount: 0,
    puzzlesCount: 0,
    dogsCount: 0,
  };

  return (
    <div className="bg-[#0b0e14] border-b border-amber-500/20 px-6 py-6 text-zinc-100 shadow-xl">
      {/* Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              F&B Menu Engineering Matrix & BCG Profitability Analyzer
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Shift 28 • BCG Matrix
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Kasavana & Smith Hospitality Matrix: Star, Plowhorse, Puzzle & Dog Optimization with Elasticity Simulator.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenSimulator}
            className="px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-bold text-xs uppercase tracking-wider border border-purple-500/40 transition-all flex items-center gap-2"
          >
            <span>🔮</span> What-If Price Simulator
          </button>
          <button
            type="button"
            onClick={onGenerateReport}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <span>⚡</span> {loading ? 'Computing...' : 'Recalculate Live Matrix'}
          </button>
        </div>
      </div>

      {/* KPI Quadrant Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/80 border border-amber-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Stars (⭐)</span>
            <span className="text-[10px] text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded">High Vol • High Margin</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-amber-400">{summary.starsCount}</span>
            <span className="text-xs text-zinc-400">Protect Consistency</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-blue-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Plowhorses (🐎)</span>
            <span className="text-[10px] text-blue-500/80 bg-blue-500/10 px-2 py-0.5 rounded">High Vol • Low Margin</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-blue-400">{summary.plowhorsesCount}</span>
            <span className="text-xs text-zinc-400">Hike Price / Trim Cost</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-purple-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Puzzles (🧩)</span>
            <span className="text-[10px] text-purple-500/80 bg-purple-500/10 px-2 py-0.5 rounded">Low Vol • High Margin</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-purple-400">{summary.puzzlesCount}</span>
            <span className="text-xs text-zinc-400">Upsell & Reposition</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-rose-500/30 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Dogs (🐕)</span>
            <span className="text-[10px] text-rose-500/80 bg-rose-500/10 px-2 py-0.5 rounded">Low Vol • Low Margin</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-rose-400">{summary.dogsCount}</span>
            <span className="text-xs text-zinc-400">Redesign or Discard</span>
          </div>
        </div>
      </div>

      {/* Benchmarks & Performance Bar */}
      {report && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-zinc-400">Total F&B Revenue: </span>
              <strong className="text-white font-mono">{MenuEngineeringHelper.formatCurrency(report.totalRevenue)}</strong>
            </div>
            <div>
              <span className="text-zinc-400">Total Profit Margin: </span>
              <strong className="text-emerald-400 font-mono">{MenuEngineeringHelper.formatCurrency(report.totalContributionMargin)}</strong>
            </div>
            <div>
              <span className="text-zinc-400">Overall Food Cost %: </span>
              <strong className="text-amber-300 font-mono">{report.overallFoodCostPercentage}%</strong>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-zinc-400">
            <span className="bg-zinc-800 px-2.5 py-1 rounded-md">
              Avg Volume Cutoff: <strong className="text-zinc-200">{report.averageVolumeBenchmark} units</strong>
            </span>
            <span className="bg-zinc-800 px-2.5 py-1 rounded-md">
              Avg Margin Cutoff: <strong className="text-zinc-200">{MenuEngineeringHelper.formatCurrency(report.averageMarginBenchmark)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-0">
        <button
          type="button"
          onClick={() => onTabChange('MATRIX')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'MATRIX'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          📊 2x2 Quadrant Visual Grid
        </button>
        <button
          type="button"
          onClick={() => onTabChange('TABLE')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'TABLE'
              ? 'border-blue-400 text-blue-400 bg-blue-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          📋 Item Breakdown & Strategy Table ({report?.items?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => onTabChange('SIMULATOR')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'SIMULATOR'
              ? 'border-purple-400 text-purple-400 bg-purple-500/10'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          🔮 What-If Elasticity Simulator
        </button>
      </div>
    </div>
  );
};
