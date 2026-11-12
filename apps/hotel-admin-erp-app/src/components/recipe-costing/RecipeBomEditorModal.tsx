import React, { useState, useEffect } from 'react';
import { IRecipeUI, INewRecipePayload, RecipeCostingHelper, NumericInput } from '@spicehub/ui';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border-2 border-amber-200 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-sm animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🍲</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {recipe ? `Edit Recipe: ${recipe.title}` : 'Create Standard Recipe BOM'}
              </h2>
              <p className="text-xs text-slate-600">
                Itemized ingredient portion costing, target food cost % and cooking SOP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900"
          >
            ✕
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Item & Portion Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Menu Item
              </label>
              <select
                value={selectedMenuItemId}
                onChange={(e) => handleMenuItemChange(e.target.value)}
                disabled={Boolean(recipe)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-amber-400 disabled:opacity-60"
              >
                {menuItems.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} (₹{m.basePrice})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Recipe Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Traditional Dum Biryani"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Yield Portions (Per Batch)
              </label>
              <NumericInput
                min="1"
                value={yieldPortions}
                onChange={(e) => setYieldPortions(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-amber-400 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Portion Size / Weight Description
              </label>
              <input
                type="text"
                value={portionSizeDescription}
                onChange={(e) => setPortionSizeDescription(e.target.value)}
                placeholder="e.g. 350g biryani + 1 boiled egg"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Selling Price (₹)
              </label>
              <NumericInput
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-amber-700 font-mono font-bold outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Target Food Cost % Limit
              </label>
              <NumericInput
                min="1"
                max="100"
                value={targetCostPercentage}
                onChange={(e) => setTargetCostPercentage(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Section 2: Bill of Materials (BOM) Ingredient Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Ingredient Bill of Materials (BOM)
              </span>
              <button
                type="button"
                onClick={handleAddIngredientRow}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-amber-700 text-xs font-bold border border-amber-200 transition-all flex items-center gap-1"
              >
                <span>+</span>
                <span>Add Ingredient</span>
              </button>
            </div>

            <div className="bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-600 uppercase pb-1 border-b border-slate-200 px-2">
                <span className="col-span-5">Ingredient Name</span>
                <span className="col-span-2 text-right">Quantity</span>
                <span className="col-span-2">Unit</span>
                <span className="col-span-2 text-right">Cost/Unit</span>
                <span className="col-span-1 text-center">Del</span>
              </div>

              {ingredients.map((ing, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={ing.ingredientName}
                      onChange={(e) => handleIngredientChange(idx, 'ingredientName', e.target.value)}
                      placeholder="e.g. Basmati Rice, Boneless Chicken..."
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <NumericInput
                      step="0.001"
                      min="0"
                      value={ing.quantity}
                      onChange={(e) => handleIngredientChange(idx, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono text-right outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={ing.unit}
                      onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 outline-none focus:border-amber-400"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <NumericInput
                      step="0.01"
                      min="0"
                      value={ing.unitCost}
                      onChange={(e) => handleIngredientChange(idx, 'unitCost', Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-amber-700 font-mono text-right outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredientRow(idx)}
                      disabled={ingredients.length <= 1}
                      className="text-slate-500 hover:text-red-400 disabled:opacity-30 p-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Live Financial Gauge Display */}
          <div className="bg-slate-50 border border-amber-200 p-4 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Batch Cost</span>
              <span className="text-base font-black font-mono text-slate-900">
                {RecipeCostingHelper.formatCurrency(totalBatchCost)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Cost / Portion</span>
              <span className="text-base font-black font-mono text-amber-700">
                {RecipeCostingHelper.formatCurrency(costPerPortion)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Food Cost %</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-lg font-black font-mono text-slate-900">{foodCostPct}%</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${health.badgeBg} ${health.badgeBorder} ${health.badgeText}`}>
                  {health.status}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Gross Margin %</span>
              <span className="text-lg font-black font-mono text-emerald-700">
                {grossMarginPct}%
              </span>
            </div>
          </div>

          {/* Section 4: Cooking Steps / SOP */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Standard Preparation Steps (SOP)
            </label>
            <textarea
              rows={3}
              value={prepStepsText}
              onChange={(e) => setPrepStepsText(e.target.value)}
              placeholder="Enter one step per line (e.g. 1. Marinate chicken with ginger-garlic paste for 45 mins...)"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedMenuItemId}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-amber-400 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-sm"
            >
              {loading ? 'Saving Recipe...' : 'Save Recipe Specification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
