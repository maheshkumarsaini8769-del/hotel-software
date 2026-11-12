import React, { useState, useEffect } from 'react';
import {
  IMenuEngineeringItemUI,
  IPriceSimulationResultUI,
  MenuEngineeringHelper,
} from '@spicehub/ui';

interface WhatIfPriceSimulatorModalProps {
  isOpen: boolean;
  item: IMenuEngineeringItemUI | null;
  allItems: IMenuEngineeringItemUI[];
  onClose: () => void;
  onSimulate: (payload: any) => Promise<IPriceSimulationResultUI | null>;
}

export const WhatIfPriceSimulatorModal: React.FC<WhatIfPriceSimulatorModalProps> = ({
  isOpen,
  item,
  allItems,
  onClose,
  onSimulate,
}) => {
  const [selectedItem, setSelectedItem] = useState<IMenuEngineeringItemUI | null>(item);
  const [priceDeltaPercent, setPriceDeltaPercent] = useState<number>(10); // default +10% price test
  const [costDeltaPercent, setCostDeltaPercent] = useState<number>(-5);  // default -5% cost reduction
  const [elasticityFactor, setElasticityFactor] = useState<number>(-0.5); // price elasticity
  const [simulation, setSimulation] = useState<IPriceSimulationResultUI | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setSelectedItem(item);
    } else if (allItems.length > 0 && !selectedItem) {
      setSelectedItem(allItems[0]);
    }
  }, [item, allItems]);

  const runSimulation = async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      const result = await onSimulate({
        itemName: selectedItem.itemName,
        currentPrice: selectedItem.sellingPrice,
        currentFoodCost: selectedItem.foodCost,
        currentVolume: selectedItem.quantitySold,
        priceDeltaPercent,
        costDeltaPercent,
        volumeElasticityFactor: elasticityFactor,
      });
      if (result) {
        setSimulation(result);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedItem) {
      runSimulation();
    }
  }, [isOpen, selectedItem, priceDeltaPercent, costDeltaPercent, elasticityFactor]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl p-6 shadow-xl text-slate-900 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="text-blue-600">📊</span> What-If Price Elasticity & Margin Simulator
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Simulate menu price hikes, portion cost trims & customer demand elasticity before publishing menu changes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {/* Item Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Select Menu Item to Test
            </label>
            <select
              value={selectedItem?.itemName || ''}
              onChange={(e) => {
                const found = allItems.find((i) => i.itemName === e.target.value);
                if (found) setSelectedItem(found);
              }}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
            >
              {allItems.map((it, idx) => (
                <option key={idx} value={it.itemName}>
                  {it.itemName} ({it.quadrant}) - Current Price: ₹{it.sellingPrice} • Margin: ₹{it.contributionMargin}
                </option>
              ))}
            </select>
          </div>

          {/* Controls Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            {/* Slider 1: Price Delta */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-800">Price Adjustment</span>
                <span className={`font-mono font-bold ${priceDeltaPercent >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {priceDeltaPercent > 0 ? `+${priceDeltaPercent}%` : `${priceDeltaPercent}%`}
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                step="5"
                value={priceDeltaPercent}
                onChange={(e) => setPriceDeltaPercent(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <span className="text-[10px] text-slate-500">Retail price delta</span>
            </div>

            {/* Slider 2: Ingredient Cost Delta */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-800">Food Cost Trim</span>
                <span className={`font-mono font-bold ${costDeltaPercent <= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {costDeltaPercent > 0 ? `+${costDeltaPercent}%` : `${costDeltaPercent}%`}
                </span>
              </div>
              <input
                type="range"
                min="-40"
                max="30"
                step="5"
                value={costDeltaPercent}
                onChange={(e) => setCostDeltaPercent(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <span className="text-[10px] text-slate-500">Recipe portion trim</span>
            </div>

            {/* Slider 3: Price Elasticity Factor */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-800">Price Elasticity (PeD)</span>
                <span className="font-mono font-bold text-amber-700">{elasticityFactor}</span>
              </div>
              <input
                type="range"
                min="-1.5"
                max="0"
                step="0.1"
                value={elasticityFactor}
                onChange={(e) => setElasticityFactor(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
              <span className="text-[10px] text-slate-500">Demand response factor</span>
            </div>
          </div>

          {/* Results Comparison Grid */}
          {simulation && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current State */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs">
                  <span className="text-[11px] font-bold uppercase text-slate-600 block border-b border-slate-200 pb-1">
                    Current Menu Reality
                  </span>
                  <div className="flex justify-between text-slate-700">
                    <span>Selling Price:</span>
                    <strong className="font-mono text-slate-900">{MenuEngineeringHelper.formatCurrency(simulation.currentState.price)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Unit Food Cost:</span>
                    <strong className="font-mono text-slate-700">{MenuEngineeringHelper.formatCurrency(simulation.currentState.cost)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Contribution Margin:</span>
                    <strong className="font-mono text-emerald-700">{MenuEngineeringHelper.formatCurrency(simulation.currentState.margin)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Sales Volume:</span>
                    <strong className="font-mono text-amber-700">{simulation.currentState.volume} units</strong>
                  </div>
                  <div className="flex justify-between text-slate-900 border-t border-slate-200 pt-1.5 font-bold">
                    <span>Total Period Profit:</span>
                    <strong className="font-mono text-slate-900">{MenuEngineeringHelper.formatCurrency(simulation.currentState.totalProfit)}</strong>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-[11px]">
                    <span className="text-slate-500">Quadrant:</span>
                    <span className="font-bold text-amber-700">{simulation.currentState.quadrant}</span>
                  </div>
                </div>

                {/* Projected State */}
                <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-2xl space-y-2 text-xs">
                  <span className="text-[11px] font-bold uppercase text-blue-800 block border-b border-blue-200 pb-1">
                    Projected Outcome Simulation
                  </span>
                  <div className="flex justify-between text-slate-700">
                    <span>Projected Price:</span>
                    <strong className="font-mono text-slate-900">{MenuEngineeringHelper.formatCurrency(simulation.projectedState.price)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Projected Food Cost:</span>
                    <strong className="font-mono text-slate-700">{MenuEngineeringHelper.formatCurrency(simulation.projectedState.cost)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Projected Margin:</span>
                    <strong className="font-mono text-emerald-700">{MenuEngineeringHelper.formatCurrency(simulation.projectedState.margin)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Projected Volume:</span>
                    <strong className="font-mono text-amber-700">{simulation.projectedState.volume} units</strong>
                  </div>
                  <div className="flex justify-between text-slate-900 border-t border-blue-200 pt-1.5 font-bold">
                    <span>Projected Period Profit:</span>
                    <strong className="font-mono text-blue-700">{MenuEngineeringHelper.formatCurrency(simulation.projectedState.totalProfit)}</strong>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-[11px]">
                    <span className="text-slate-600">Projected Quadrant:</span>
                    <span className="font-bold text-blue-700">{simulation.projectedState.quadrant}</span>
                  </div>
                </div>
              </div>

              {/* Profit Impact Highlight Banner */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                    Simulated Bottom-Line Net Gain:
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {simulation.projectedState.actionStrategy}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-2xl font-black font-mono ${
 simulation.impact.profitDifference >= 0 ? 'text-emerald-700' : 'text-rose-600'
 }`}
                  >
                    {simulation.impact.profitDifference >= 0 ? '+' : ''}
                    {MenuEngineeringHelper.formatCurrency(simulation.impact.profitDifference)}
                  </span>
                  <span className="block text-[11px] text-slate-600">
                    ({simulation.impact.profitGrowthPercentage >= 0 ? '+' : ''}
                    {simulation.impact.profitGrowthPercentage}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider transition-all"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
