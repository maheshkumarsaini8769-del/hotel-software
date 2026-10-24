import React from 'react';
import { IMenuEngineeringItemUI, MenuEngineeringHelper } from '@spicehub/ui';

interface QuadrantScatterPlotCardProps {
  items: IMenuEngineeringItemUI[];
  onSelectItem: (item: IMenuEngineeringItemUI) => void;
  onSimulateItem: (item: IMenuEngineeringItemUI) => void;
}

export const QuadrantScatterPlotCard: React.FC<QuadrantScatterPlotCardProps> = ({
  items,
  onSelectItem,
  onSimulateItem,
}) => {
  const stars = items.filter((i) => i.quadrant === 'STAR');
  const plowhorses = items.filter((i) => i.quadrant === 'PLOWHORSE');
  const puzzles = items.filter((i) => i.quadrant === 'PUZZLE');
  const dogs = items.filter((i) => i.quadrant === 'DOG');

  const renderQuadrantBox = (
    title: string,
    subtitle: string,
    quadrantItems: IMenuEngineeringItemUI[],
    theme: {
      border: string;
      bg: string;
      headerBg: string;
      titleColor: string;
      icon: string;
      advice: string;
    }
  ) => {
    return (
      <div className={`rounded-2xl border ${theme.border} ${theme.bg} p-4 flex flex-col min-h-[300px]`}>
        <div className={`p-3 rounded-xl ${theme.headerBg} flex items-center justify-between mb-3`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{theme.icon}</span>
              <h3 className={`text-sm font-black uppercase tracking-wider ${theme.titleColor}`}>
                {title}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900/80 text-zinc-300 font-mono font-bold">
                {quadrantItems.length}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>
          </div>
          <span className="text-[10px] uppercase font-semibold text-zinc-400 max-w-[150px] text-right">
            {theme.advice}
          </span>
        </div>

        {/* Item Chips / List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[320px]">
          {quadrantItems.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs">
              No dishes currently classified in this quadrant
            </div>
          ) : (
            quadrantItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onSelectItem(item)}
                className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 p-3 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                      {item.itemName}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">({item.category})</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-3 font-mono">
                    <span>Sold: <strong className="text-zinc-200">{item.quantitySold}</strong></span>
                    <span>Margin: <strong className="text-emerald-400">{MenuEngineeringHelper.formatCurrency(item.contributionMargin)}</strong></span>
                    <span>Price: <strong className="text-zinc-300">{MenuEngineeringHelper.formatCurrency(item.sellingPrice)}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSimulateItem(item);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 text-[11px] font-semibold border border-zinc-700 hover:border-purple-500/40 transition-all"
                  title="Simulate Price Elasticity"
                >
                  🔮 Test Price
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
        <div className="flex items-center gap-2">
          <span>Y-Axis: <strong className="text-emerald-400">Contribution Margin (Profit)</strong></span>
          <span>•</span>
          <span>X-Axis: <strong className="text-amber-400">Sales Volume (Popularity)</strong></span>
        </div>
        <span className="text-zinc-500 italic">Kasavana & Smith 2x2 Hospitality Matrix</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top-Left: PUZZLE */}
        {renderQuadrantBox(
          'Puzzles (High Margin, Low Volume)',
          'High profitability, but lower guest order frequency.',
          puzzles,
          {
            border: 'border-purple-500/30',
            bg: 'bg-purple-950/10',
            headerBg: 'bg-purple-900/20',
            titleColor: 'text-purple-400',
            icon: '🧩',
            advice: 'Upsell via staff & menu redesign',
          }
        )}

        {/* Top-Right: STAR */}
        {renderQuadrantBox(
          'Stars (High Margin, High Volume)',
          'The engine of restaurant profitability & guest delight.',
          stars,
          {
            border: 'border-amber-500/30',
            bg: 'bg-amber-950/10',
            headerBg: 'bg-amber-900/20',
            titleColor: 'text-amber-400',
            icon: '⭐',
            advice: 'Maintain recipe consistency',
          }
        )}

        {/* Bottom-Left: DOG */}
        {renderQuadrantBox(
          'Dogs (Low Margin, Low Volume)',
          'Low profitability and infrequent customer orders.',
          dogs,
          {
            border: 'border-rose-500/30',
            bg: 'bg-rose-950/10',
            headerBg: 'bg-rose-900/20',
            titleColor: 'text-rose-400',
            icon: '🐕',
            advice: 'Phase-out or overhaul recipe',
          }
        )}

        {/* Bottom-Right: PLOWHORSE */}
        {renderQuadrantBox(
          'Plowhorses (Low Margin, High Volume)',
          'Customer favorites that yield modest profit margins.',
          plowhorses,
          {
            border: 'border-blue-500/30',
            bg: 'bg-blue-950/10',
            headerBg: 'bg-blue-900/20',
            titleColor: 'text-blue-400',
            icon: '🐎',
            advice: 'Increase price or trim portion cost',
          }
        )}
      </div>
    </div>
  );
};
