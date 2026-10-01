import React, { useState, useEffect } from 'react';
import { IRecipeUI, INewRecipePayload, RecipeCostingHelper } from '@spicehub/ui';

interface RecipeBomEditorModalProps {
  isOpen: boolean;
  recipe?: IRecipeUI | null;
  menuItems: Array<{ _id: string; name: string; basePrice: number }>;
  onClose: () => void;
  onSave: (payload: INewRecipePayload) => Promise<void>;
  loading: boolean;
}

export const RecipeBomEditorModal: React.FC<RecipeBomEditorModalProps> = ({
  isOpen,
  recipe,
  menuItems,
  onClose,
  onSave,
  loading,
}) => {
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [title, setTitle] = useState('');
  const [yieldPortions, setYieldPortions] = useState(1);
  const [portionSizeDescription, setPortionSizeDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState(0);
  const [targetCostPercentage, setTargetCostPercentage] = useState(32);
  const [ingredients, setIngredients] = useState<
    Array<{
      ingredientName: string;
      quantity: number;
      unit: 'kg' | 'g' | 'l' | 'ml' | 'pcs';
      unitCost: number;
      rawMaterialSku?: string;
    }>
  >([
    { ingredientName: '', quantity: 1, unit: 'kg', unitCost: 0 },
  ]);
  const [prepStepsText, setPrepStepsText] = useState('');

  useEffect(() => {
    if (recipe) {
      const mId = typeof recipe.menuItemId === 'object' ? recipe.menuItemId?._id : recipe.menuItemId;
      setSelectedMenuItemId(mId || '');
      setTitle(recipe.title || '');
      setYieldPortions(recipe.yieldPortions || 1);
      setPortionSizeDescription(recipe.portionSizeDescription || '');
      setSellingPrice(recipe.targetSellingPrice || 0);
      setTargetCostPercentage(recipe.targetCostPercentage || 32);
      setIngredients(
        recipe.ingredients && recipe.ingredients.length > 0
          ? recipe.ingredients.map((ing) => ({
              ingredientName: ing.ingredientName,
              quantity: ing.quantity,
              unit: ing.unit,
              unitCost: ing.unitCost,
              rawMaterialSku: ing.rawMaterialSku,
            }))
          : [{ ingredientName: '', quantity: 1, unit: 'kg', unitCost: 0 }]
      );
      setPrepStepsText(recipe.preparationSteps?.join('\n') || '');
    } else {
      setSelectedMenuItemId(menuItems[0]?._id || '');
      setTitle('');
      setYieldPortions(1);
      setPortionSizeDescription('');
      setSellingPrice(menuItems[0]?.basePrice || 0);
      setTargetCostPercentage(32);
      setIngredients([{ ingredientName: '', quantity: 1, unit: 'kg', unitCost: 0 }]);
      setPrepStepsText('');
    }
  }, [recipe, menuItems, isOpen]);

  if (!isOpen) return null;

  const handleMenuItemChange = (id: string) => {
    setSelectedMenuItemId(id);
    const item = menuItems.find((m) => m._id === id);
    if (item) {
      if (!title || !recipe) setTitle(`${item.name} Recipe`);
      setSellingPrice(item.basePrice);
    }
  };

  const handleAddIngredientRow = () => {
    setIngredients((prev) => [...prev, { ingredientName: '', quantity: 1, unit: 'kg', unitCost: 0 }]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Live Costing Calculations
  const totalBatchCost = RecipeCostingHelper.calculateTotalBatchCost(ingredients);
  const costPerPortion = Math.max(1, yieldPortions) > 0
    ? Math.round((totalBatchCost / Math.max(1, yieldPortions)) * 100) / 100
    : 0;
  const { foodCostPct, grossMarginPct } = RecipeCostingHelper.calculateRecipeMargin(
    costPerPortion,
    sellingPrice
  );
  const health = RecipeCostingHelper.getCostHealthBadge(foodCostPct, targetCostPercentage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenuItemId) return;

    const validIngredients = ingredients.filter((ing) => ing.ingredientName.trim());
    const steps = prepStepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    await onSave({
      menuItemId: selectedMenuItemId,
      title: title || 'Standard Recipe',
      recipeCode: recipe?.recipeCode,
      yieldPortions: Number(yieldPortions) || 1,
      portionSizeDescription,
      ingredients: validIngredients,
      preparationSteps: steps,
      sellingPrice: Number(sellingPrice),
      targetCostPercentage: Number(targetCostPercentage),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0f131a] border-2 border-amber-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.25)] animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-[#121620] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🍲</span>
            <div>
              <h2 className="text-lg font-bold text-white">
                {recipe ? `Edit Recipe: ${recipe.title}` : 'Create Standard Recipe BOM'}
              </h2>
              <p className="text-xs text-zinc-400">
                Itemized ingredient portion costing, target food cost % and cooking SOP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Item & Portion Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Menu Item
              </label>
              <select
                value={selectedMenuItemId}
                onChange={(e) => handleMenuItemChange(e.target.value)}
                disabled={Boolean(recipe)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-amber-400 disabled:opacity-60"
              >
                {menuItems.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} (₹{m.basePrice})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Recipe Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Traditional Dum Biryani"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Yield Portions (Per Batch)
              </label>
              <input
                type="number"
                min="1"
                value={yieldPortions}
                onChange={(e) => setYieldPortions(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-amber-400 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Portion Size / Weight Description
              </label>
              <input
                type="text"
                value={portionSizeDescription}
                onChange={(e) => setPortionSizeDescription(e.target.value)}
                placeholder="e.g. 350g biryani + 1 boiled egg"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Selling Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-amber-400 font-mono font-bold outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Target Food Cost % Limit
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={targetCostPercentage}
                onChange={(e) => setTargetCostPercentage(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white font-mono outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Section 2: Bill of Materials (BOM) Ingredient Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Ingredient Bill of Materials (BOM)
              </span>
              <button
                type="button"
                onClick={handleAddIngredientRow}
                className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all flex items-center gap-1"
              >
                <span>+</span>
                <span>Add Ingredient</span>
              </button>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl overflow-hidden p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-zinc-400 uppercase pb-1 border-b border-zinc-800 px-2">
                <span className="col-span-5">Ingredient Name</span>
                <span className="col-span-2 text-right">Quantity</span>
                <span className="col-span-2">Unit</span>
                <span className="col-span-2 text-right">Cost/Unit</span>
                <span className="col-span-1 text-center">Del</span>
              </div>

              {ingredients.map((ing, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80">
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={ing.ingredientName}
                      onChange={(e) => handleIngredientChange(idx, 'ingredientName', e.target.value)}
                      placeholder="e.g. Basmati Rice, Boneless Chicken..."
                      className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={ing.quantity}
                      onChange={(e) => handleIngredientChange(idx, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white font-mono text-right outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={ing.unit}
                      onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                      className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white outline-none focus:border-amber-400"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ing.unitCost}
                      onChange={(e) => handleIngredientChange(idx, 'unitCost', Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-amber-400 font-mono text-right outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredientRow(idx)}
                      disabled={ingredients.length <= 1}
                      className="text-zinc-500 hover:text-red-400 disabled:opacity-30 p-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Live Financial Gauge Display */}
          <div className="bg-zinc-950 border border-amber-500/30 p-4 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Total Batch Cost</span>
              <span className="text-base font-black font-mono text-white">
                {RecipeCostingHelper.formatCurrency(totalBatchCost)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Cost / Portion</span>
              <span className="text-base font-black font-mono text-amber-400">
                {RecipeCostingHelper.formatCurrency(costPerPortion)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Food Cost %</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-lg font-black font-mono text-white">{foodCostPct}%</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${health.badgeBg} ${health.badgeBorder} ${health.badgeText}`}>
                  {health.status}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Gross Margin %</span>
              <span className="text-lg font-black font-mono text-emerald-400">
                {grossMarginPct}%
              </span>
            </div>
          </div>

          {/* Section 4: Cooking Steps / SOP */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
              Standard Preparation Steps (SOP)
            </label>
            <textarea
              rows={3}
              value={prepStepsText}
              onChange={(e) => setPrepStepsText(e.target.value)}
              placeholder="Enter one step per line (e.g. 1. Marinate chicken with ginger-garlic paste for 45 mins...)"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedMenuItemId}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              {loading ? 'Saving Recipe...' : 'Save Recipe Specification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
