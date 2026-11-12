import React from 'react';
import { IRecipeUI, RecipeCostingHelper } from '@spicehub/ui';

interface RecipeCardProps {
  recipe: IRecipeUI;
  onEdit: (recipe: IRecipeUI) => void;
  onView: (recipe: IRecipeUI) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onEdit, onView }) => {
  const health = RecipeCostingHelper.getCostHealthBadge(
    recipe.foodCostPercentage,
    recipe.targetCostPercentage || 32
  );
  const grossProfitAmount = Math.max(0, (recipe.targetSellingPrice || 0) - (recipe.costPerPortion || 0));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-amber-300 p-5 flex flex-col justify-between transition-all duration-200 group shadow-lg">
      <div>
        {/* Header: Recipe Code & Health Badge */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <span className="px-2 py-0.5 rounded bg-white text-amber-700 font-mono text-xs font-bold border border-amber-200">
            {recipe.recipeCode}
          </span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${health.badgeBg} ${health.badgeBorder} ${health.badgeText}`}>
            {recipe.foodCostPercentage}% Food Cost
          </span>
        </div>

        {/* Title & Portion Description */}
        <div className="mt-3">
          <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-300 transition-colors line-clamp-1">
            {recipe.title}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
            {recipe.portionSizeDescription || `Yield: ${recipe.yieldPortions} portion(s)`}
          </p>
        </div>

        {/* Financial Matrix Grid */}
        <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-100 p-3 rounded-xl border border-slate-200">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Selling Price</span>
            <span className="text-sm font-black font-mono text-slate-900">
              {RecipeCostingHelper.formatCurrency(recipe.targetSellingPrice)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Portion Cost</span>
            <span className="text-sm font-black font-mono text-amber-700">
              {RecipeCostingHelper.formatCurrency(recipe.costPerPortion)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Gross Profit</span>
            <span className="text-sm font-black font-mono text-emerald-700">
              {RecipeCostingHelper.formatCurrency(grossProfitAmount)}
            </span>
          </div>
        </div>

        {/* Ingredients Summary Preview */}
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1.5">
            <span>BOM Ingredients:</span>
            <span className="font-mono text-slate-700">{recipe.ingredients?.length || 0} items</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recipe.ingredients?.slice(0, 3).map((ing, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-white text-[10px] text-slate-700 border border-slate-200 truncate max-w-[130px]"
              >
                {ing.ingredientName} ({ing.quantity}{ing.unit})
              </span>
            ))}
            {(recipe.ingredients?.length || 0) > 3 && (
              <span className="px-1.5 py-0.5 rounded-md bg-white text-[10px] text-amber-700 border border-slate-200">
                +{(recipe.ingredients?.length || 0) - 3} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onView(recipe)}
          className="flex-1 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-all text-center"
        >
          View SOP
        </button>
        <button
          type="button"
          onClick={() => onEdit(recipe)}
          className="flex-1 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs border border-amber-200 transition-all text-center shadow-sm"
        >
          Edit BOM
        </button>
      </div>
    </div>
  );
};
