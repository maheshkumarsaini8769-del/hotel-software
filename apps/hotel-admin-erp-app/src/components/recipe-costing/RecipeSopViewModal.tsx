import React from 'react';
import { IRecipeUI, RecipeCostingHelper } from '@spicehub/ui';

interface RecipeSopViewModalProps {
  isOpen: boolean;
  recipe: IRecipeUI | null;
  onClose: () => void;
}

export const RecipeSopViewModal: React.FC<RecipeSopViewModalProps> = ({
  isOpen,
  recipe,
  onClose,
}) => {
  if (!isOpen || !recipe) return null;

  const menuItemName =
    typeof recipe.menuItemId === 'object' ? recipe.menuItemId?.name : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-amber-500/40 bg-slate-900 text-zinc-100 shadow-sm dark:shadow-none">
        <div className="flex items-start justify-between border-b border-zinc-800 bg-slate-900 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📖</span>
              <h2 className="text-lg font-black text-white">{recipe.title}</h2>
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                {recipe.recipeCode}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {menuItemName || 'Menu item'} · {recipe.yieldPortions} portion
              {recipe.yieldPortions === 1 ? '' : 's'} · {recipe.portionSizeDescription || 'Standard portion'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 hover:text-white"
            aria-label="Close recipe"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Batch Cost', value: RecipeCostingHelper.formatCurrency(recipe.totalBatchCost) },
              { label: 'Cost / Portion', value: RecipeCostingHelper.formatCurrency(recipe.costPerPortion) },
              { label: 'Food Cost %', value: `${recipe.foodCostPercentage}%` },
              { label: 'Gross Margin %', value: `${recipe.grossMarginPercentage}%` },
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-[10px] font-semibold uppercase text-zinc-500">{metric.label}</div>
                <div className="mt-1 font-mono text-base font-black text-amber-300">{metric.value}</div>
              </div>
            ))}
          </div>

          <section>
            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-amber-400">
              Ingredient Bill of Materials
            </h3>
            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 text-[10px] uppercase text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">Ingredient</th>
                    <th className="px-3 py-2 text-right">Quantity</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">Unit Cost</th>
                    <th className="px-3 py-2 text-right">Line Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {recipe.ingredients.map((ingredient, index) => (
                    <tr key={`${ingredient.ingredientName}-${index}`} className="bg-zinc-950/60">
                      <td className="px-3 py-2 font-medium text-zinc-200">
                        {ingredient.ingredientName}
                        {ingredient.rawMaterialSku && (
                          <span className="ml-2 font-mono text-[10px] text-zinc-500">
                            {ingredient.rawMaterialSku}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-zinc-300">
                        {ingredient.quantity}
                      </td>
                      <td className="px-3 py-2 text-zinc-400">{ingredient.unit}</td>
                      <td className="px-3 py-2 text-right font-mono text-zinc-300">
                        {RecipeCostingHelper.formatCurrency(ingredient.unitCost)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-amber-300">
                        {RecipeCostingHelper.formatCurrency(
                          Number(ingredient.quantity) * Number(ingredient.unitCost)
                        )}
                      </td>
                    </tr>
                  ))}
                  {recipe.ingredients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                        No ingredients configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-amber-400">
              Standard Preparation Steps (SOP)
            </h3>
            {recipe.preparationSteps?.length ? (
              <ol className="space-y-2">
                {recipe.preparationSteps.map((step, index) => (
                  <li
                    key={`${step}-${index}`}
                    className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-300"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 font-mono text-[10px] font-black text-amber-300">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-xs text-zinc-500">
                No SOP steps have been documented for this recipe.
              </p>
            )}
          </section>
        </div>

        <div className="flex justify-end border-t border-zinc-800 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-black hover:bg-amber-400"
          >
            Close Recipe
          </button>
        </div>
      </div>
    </div>
  );
};
