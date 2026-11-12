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
    <div className="bg-white border-b border-amber-200 px-6 py-6 text-slate-900 shadow-xl">
      {/* Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse shadow-sm" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              F&B Menu Engineering Matrix & BCG Profitability Analyzer
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Shift 28 • BCG Matrix
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Kasavana & Smith Hospitality Matrix: Star, Plowhorse, Puzzle & Dog Optimization with Elasticity Simulator.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenSimulator}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider border border-slate-200 transition-all flex items-center gap-2"
          >
            <span>🔮</span> What-If Price Simulator
          </button>
          <button
            type="button"
            onClick={onGenerateReport}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <span>⚡</span> {loading ? 'Computing...' : 'Recalculate Live Matrix'}
          </button>
        </div>
      </div>

      {/* KPI Quadrant Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-amber-200 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Stars (⭐)</span>
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">High Vol • High Margin</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-amber-700">{summary.starsCount}</span>
            <span className="text-xs text-slate-600">Protect Consistency</span>
          </div>
        </div>

        <div className="bg-white border border-blue-200 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Plowhorses (🐎)</span>
            <span className="text-[10px] text-blue-500/80 bg-blue-50 px-2 py-0.5 rounded">High Vol • Low Margin</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-blue-700">{summary.plowhorsesCount}</span>
            <span className="text-xs text-slate-600">Hike Price / Trim Cost</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Puzzles (🧩)</span>
            <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Low Vol • High Margin</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-slate-700">{summary.puzzlesCount}</span>
            <span className="text-xs text-slate-600">Upsell & Reposition</span>
          </div>
        </div>

        <div className="bg-white border border-red-200 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-700">Dogs (🐕)</span>
            <span className="text-[10px] text-red-500/80 bg-red-50 px-2 py-0.5 rounded">Low Vol • Low Margin</span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-red-700">{summary.dogsCount}</span>
            <span className="text-xs text-slate-600">Redesign or Discard</span>
          </div>
        </div>
      </div>

      {/* Benchmarks & Performance Bar */}
      {report && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-600">Total F&B Revenue: </span>
              <strong className="text-slate-900 font-mono">{MenuEngineeringHelper.formatCurrency(report.totalRevenue)}</strong>
            </div>
            <div>
              <span className="text-slate-600">Total Profit Margin: </span>
              <strong className="text-emerald-700 font-mono">{MenuEngineeringHelper.formatCurrency(report.totalContributionMargin)}</strong>
            </div>
            <div>
              <span className="text-slate-600">Overall Food Cost %: </span>
              <strong className="text-amber-700 font-mono">{report.overallFoodCostPercentage}%</strong>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-600">
            <span className="bg-slate-100 px-2.5 py-1 rounded-md">
              Avg Volume Cutoff: <strong className="text-slate-900">{report.averageVolumeBenchmark} units</strong>
            </span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-md">
              Avg Margin Cutoff: <strong className="text-slate-900">{MenuEngineeringHelper.formatCurrency(report.averageMarginBenchmark)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
        <button
          type="button"
          onClick={() => onTabChange('MATRIX')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
 activeTab === 'MATRIX'
 ? 'border-amber-400 text-amber-700 bg-emerald-50'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
        >
          📊 2x2 Quadrant Visual Grid
        </button>
        <button
          type="button"
          onClick={() => onTabChange('TABLE')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
 activeTab === 'TABLE'
 ? 'border-blue-400 text-blue-700 bg-blue-50'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
        >
          📋 Item Breakdown & Strategy Table ({report?.items?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => onTabChange('SIMULATOR')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
 activeTab === 'SIMULATOR'
 ? 'border-slate-200 text-slate-700 bg-slate-100'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
        >
          🔮 What-If Elasticity Simulator
        </button>
      </div>
    </div>
  );
};
