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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f131a] border border-purple-500/30 w-full max-w-3xl rounded-2xl p-6 shadow-2xl text-zinc-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">🔮</span> What-If Price Elasticity & Margin Simulator
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Simulate menu price hikes, portion cost trims & customer demand elasticity before publishing menu changes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {/* Item Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Select Menu Item to Test
            </label>
            <select
              value={selectedItem?.itemName || ''}
              onChange={(e) => {
                const found = allItems.find((i) => i.itemName === e.target.value);
                if (found) setSelectedItem(found);
              }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
            >
              {allItems.map((it, idx) => (
                <option key={idx} value={it.itemName}>
                  {it.itemName} ({it.quadrant}) - Current Price: ₹{it.sellingPrice} • Margin: ₹{it.contributionMargin}
                </option>
              ))}
            </select>
          </div>

          {/* Controls Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
            {/* Slider 1: Price Delta */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-300">Price Adjustment</span>
                <span className={`font-mono font-bold ${priceDeltaPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                className="w-full accent-purple-500"
              />
              <span className="text-[10px] text-zinc-500">Retail price delta</span>
            </div>

            {/* Slider 2: Ingredient Cost Delta */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-300">Food Cost Trim</span>
                <span className={`font-mono font-bold ${costDeltaPercent <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                className="w-full accent-emerald-500"
              />
              <span className="text-[10px] text-zinc-500">Recipe portion trim</span>
            </div>

            {/* Slider 3: Price Elasticity Factor */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-300">Price Elasticity (PeD)</span>
                <span className="font-mono font-bold text-amber-400">{elasticityFactor}</span>
              </div>
              <input
                type="range"
                min="-1.5"
                max="0"
                step="0.1"
                value={elasticityFactor}
                onChange={(e) => setElasticityFactor(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="text-[10px] text-zinc-500">Demand response factor</span>
            </div>
          </div>

          {/* Results Comparison Grid */}
          {simulation && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current State */}
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-2 text-xs">
                  <span className="text-[11px] font-bold uppercase text-zinc-400 block border-b border-zinc-800 pb-1">
                    Current Menu Reality
                  </span>
                  <div className="flex justify-between text-zinc-300">
                    <span>Selling Price:</span>
                    <strong className="font-mono">{MenuEngineeringHelper.formatCurrency(simulation.currentState.price)}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Unit Food Cost:</span>
                    <strong className="font-mono text-zinc-400">{MenuEngineeringHelper.formatCurrency(simulation.currentState.cost)}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Contribution Margin:</span>
                    <strong className="font-mono text-emerald-400">{MenuEngineeringHelper.formatCurrency(simulation.currentState.margin)}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Sales Volume:</span>
                    <strong className="font-mono text-amber-300">{simulation.currentState.volume} units</strong>
                  </div>
                  <div className="flex justify-between text-zinc-300 border-t border-zinc-800 pt-1.5 font-bold">
                    <span>Total Period Profit:</span>
                    <strong className="font-mono text-white">{MenuEngineeringHelper.formatCurrency(simulation.currentState.totalProfit)}</strong>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-[11px]">
                    <span className="text-zinc-500">Quadrant:</span>
                    <span className="font-bold text-amber-400">{simulation.currentState.quadrant}</span>
                  </div>
                </div>

                {/* Projected State */}
                <div className="bg-purple-950/20 border border-purple-500/40 p-4 rounded-2xl space-y-2 text-xs">
                  <span className="text-[11px] font-bold uppercase text-purple-400 block border-b border-purple-500/30 pb-1">
                    Projected Outcome Simulation
                  </span>
                  <div className="flex justify-between text-zinc-300">
                    <span>Projected Price:</span>
                    <strong className="font-mono text-white">{MenuEngineeringHelper.formatCurrency(simulation.projectedState.price)}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Projected Food Cost:</span>
                    <strong className="font-mono text-zinc-400">{MenuEngineeringHelper.formatCurrency(simulation.projectedState.cost)}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Projected Margin:</span>
                    <strong className="font-mono text-emerald-400">{MenuEngineeringHelper.formatCurrency(simulation.projectedState.margin)}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Projected Volume:</span>
                    <strong className="font-mono text-amber-300">{simulation.projectedState.volume} units</strong>
                  </div>
                  <div className="flex justify-between text-zinc-300 border-t border-purple-500/30 pt-1.5 font-bold">
                    <span>Projected Period Profit:</span>
                    <strong className="font-mono text-emerald-300">{MenuEngineeringHelper.formatCurrency(simulation.projectedState.totalProfit)}</strong>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-[11px]">
                    <span className="text-zinc-400">Projected Quadrant:</span>
                    <span className="font-bold text-purple-300">{simulation.projectedState.quadrant}</span>
                  </div>
                </div>
              </div>

              {/* Profit Impact Highlight Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-purple-950/40 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                    Simulated Bottom-Line Net Gain:
                  </span>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {simulation.projectedState.actionStrategy}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-2xl font-black font-mono ${
                      simulation.impact.profitDifference >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {simulation.impact.profitDifference >= 0 ? '+' : ''}
                    {MenuEngineeringHelper.formatCurrency(simulation.impact.profitDifference)}
                  </span>
                  <span className="block text-[11px] text-zinc-400">
                    ({simulation.impact.profitGrowthPercentage >= 0 ? '+' : ''}
                    {simulation.impact.profitGrowthPercentage}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase tracking-wider transition-all"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
