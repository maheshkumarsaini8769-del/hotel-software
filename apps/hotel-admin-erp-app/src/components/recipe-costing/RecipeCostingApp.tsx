import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';
import {
  RecipeCostingStore,
  IRecipeUI,
  IRecipeMetricsUI,
  IFoodWasteLogUI,
  IFoodWasteSummaryUI,
  INewRecipePayload,
  ILogWastePayload,
} from '@spicehub/ui';
import { RecipeCostingHeader } from './RecipeCostingHeader';
import { RecipeCard } from './RecipeCard';
import { RecipeBomEditorModal } from './RecipeBomEditorModal';
import { RecipeSopViewModal } from './RecipeSopViewModal';
import { FoodWasteLogModal } from './FoodWasteLogModal';
import { FoodWasteAuditTable } from './FoodWasteAuditTable';

interface RecipeCostingAppProps {
  apiBaseUrl?: string;
  token?: string;
}

export const RecipeCostingApp: React.FC<RecipeCostingAppProps> = ({
  apiBaseUrl = API_BASE_URL,
  token,
}) => {
  const [store] = useState(() => new RecipeCostingStore());
  const [recipes, setRecipes] = useState<IRecipeUI[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<IRecipeUI | null>(null);
  const [metrics, setMetrics] = useState<IRecipeMetricsUI>({
    totalRecipesCount: 0,
    highCostRecipesCount: 0,
    averageFoodCostPercentage: 0,
    targetFoodCostPercentage: 32,
    menuItemCount: 0,
    recipeCoverageCount: 0,
    recipeCoveragePercentage: 0,
  });
  const [wasteLogs, setWasteLogs] = useState<IFoodWasteLogUI[]>([]);
  const [wasteSummary, setWasteSummary] = useState<IFoodWasteSummaryUI>({
    totalEntriesCount: 0,
    totalLossAmount: 0,
    daysAudited: 30,
    wasteBreakdownByType: {},
    lossByShift: {},
  });
  const [activeTab, setActiveTab] = useState<'RECIPES' | 'WASTE_AUDIT'>('RECIPES');
  const [wasteFilter, setWasteFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<'EDIT_RECIPE' | 'LOG_WASTE' | 'VIEW_RECIPE' | null>(null);
  const [menuItems, setMenuItems] = useState<Array<{ _id: string; name: string; basePrice: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [recipesError, setRecipesError] = useState('');
  const [wasteError, setWasteError] = useState('');
  const [menuItemsError, setMenuItemsError] = useState('');
  const [actionError, setActionError] = useState('');

  // Subscribe to store
  useEffect(() => {
    const unsub = store.subscribe((state) => {
      setRecipes(state.recipes);
      setSelectedRecipe(state.selectedRecipe);
      setMetrics(state.metrics);
      setWasteLogs(state.wasteLogs);
      setWasteSummary(state.wasteSummary);
      setActiveTab(state.activeTab);
      setWasteFilter(state.wasteTypeFilter);
      setSearchQuery(state.searchQuery);
      setActiveModal(state.activeModal);
      setLoading(state.loading);
    });
    return unsub;
  }, [store]);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  // Fetch Recipes
  const fetchRecipes = useCallback(async () => {
    try {
      store.setLoading(true);
      const res = await fetch(`${apiBaseUrl}/recipe-costing/recipes`, {
        credentials: 'include',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !Array.isArray(data.recipes)) {
        throw new Error(data?.message || 'Recipe data could not be loaded.');
      }
      store.setRecipes(data.recipes, data.metrics);
      setRecipesError('');
    } catch (error) {
      setRecipesError(error instanceof Error ? error.message : 'Recipe data could not be loaded.');
    } finally {
      store.setLoading(false);
    }
  }, [apiBaseUrl, authHeaders, store]);

  // Fetch Food Waste Logs
  const fetchWasteAudit = useCallback(async () => {
    try {
      const url = `${apiBaseUrl}/recipe-costing/waste/audit?wasteType=${wasteFilter}`;
      const res = await fetch(url, { credentials: 'include', headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !Array.isArray(data.logs)) {
        throw new Error(data?.message || 'Food waste audit could not be loaded.');
      }
      store.setWasteLogs(data.logs, data.summary);
      setWasteError('');
    } catch (error) {
      setWasteError(error instanceof Error ? error.message : 'Food waste audit could not be loaded.');
    }
  }, [apiBaseUrl, authHeaders, store, wasteFilter]);

  // Fetch Menu Items
  const fetchMenuItems = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/pos/menu`, { credentials: 'include', headers: authHeaders() });
      const data = await res.json().catch(() => null);
      const items = data?.data?.menuItems || data?.data?.items || data?.data || data?.menuItems || data?.items;
      if (!res.ok || !Array.isArray(items)) {
        throw new Error(data?.message || 'Hotel menu items could not be loaded.');
      }
      setMenuItems(items.map((item: any) => ({
        _id: String(item._id || item.id || ''),
        name: String(item.name || ''),
        basePrice: Number(item.basePrice ?? item.price ?? 0),
      })).filter((item: { _id: string; name: string; basePrice: number }) => item._id && item.name));
      setMenuItemsError('');
    } catch (error) {
      setMenuItems([]);
      setMenuItemsError(error instanceof Error ? error.message : 'Hotel menu items could not be loaded.');
    }
  }, [apiBaseUrl, authHeaders]);

  useEffect(() => {
    fetchRecipes();
    fetchWasteAudit();
    fetchMenuItems();
  }, [fetchRecipes, fetchWasteAudit, fetchMenuItems]);

  // Handle Save Recipe BOM
  const handleSaveRecipe = async (payload: INewRecipePayload) => {
    try {
      setActionError('');
      store.setLoading(true);
      const res = await fetch(`${apiBaseUrl}/recipe-costing/recipes`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Recipe BOM could not be saved.');
      }
      store.setActiveModal(null);
      await fetchRecipes();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Recipe BOM could not be saved.');
    } finally {
      store.setLoading(false);
    }
  };

  // Handle Log Food Waste
  const handleSaveWaste = async (payload: ILogWastePayload) => {
    try {
      setActionError('');
      store.setLoading(true);
      const res = await fetch(`${apiBaseUrl}/recipe-costing/waste`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Food waste entry could not be saved.');
      }
      store.setActiveModal(null);
      await fetchWasteAudit();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Food waste entry could not be saved.');
    } finally {
      store.setLoading(false);
    }
  };

  // Filtered recipes
  const filteredRecipes = recipes.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.recipeCode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none">
      {/* Header */}
      <RecipeCostingHeader
        metrics={metrics}
        wasteSummary={wasteSummary}
        activeTab={activeTab}
        onTabChange={(tab) => store.setActiveTab(tab)}
        onNewRecipeClick={() => {
          if (menuItems.length === 0) {
            setMenuItemsError('Add a menu item before creating a recipe BOM.');
            return;
          }
          store.setSelectedRecipe(null);
          store.setActiveModal('EDIT_RECIPE');
        }}
        onLogWasteClick={() => store.setActiveModal('LOG_WASTE')}
        onRefreshClick={() => {
          fetchRecipes();
          fetchWasteAudit();
          fetchMenuItems();
        }}
        loading={loading}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 p-6 max-w-[1700px] w-full mx-auto">
        {[recipesError, wasteError, menuItemsError].filter(Boolean).length > 0 && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-200"
          >
            {[...new Set([recipesError, wasteError, menuItemsError].filter(Boolean))].map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}
        {actionError && (
          <div
            role="alert"
            className="fixed left-1/2 top-4 z-[80] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-950 px-4 py-3 text-sm text-red-100 shadow-xl"
          >
            <p>{actionError}</p>
            <button
              type="button"
              onClick={() => setActionError('')}
              className="shrink-0 rounded px-2 py-1 text-red-200 hover:bg-red-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              Dismiss
            </button>
          </div>
        )}
        {activeTab === 'RECIPES' ? (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  🔍
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => store.setSearchQuery(e.target.value)}
                  placeholder="Search standard recipe or recipe code..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400"
                />
              </div>
              <span className="text-xs text-slate-600 font-mono">
                Showing {filteredRecipes.length} of {recipes.length} standard recipes
              </span>
            </div>

            {/* Recipe Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRecipes.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
                  <span className="text-3xl">📋</span>
                  <span>No recipe specifications found matching your query</span>
                  <button
                    type="button"
                    disabled={menuItems.length === 0}
                    onClick={() => {
                      store.setSelectedRecipe(null);
                      store.setActiveModal('EDIT_RECIPE');
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {menuItems.length === 0 ? 'Add a Menu Item First' : '+ Create First Recipe BOM'}
                  </button>
                </div>
              ) : (
                filteredRecipes.map((rcp) => (
                  <RecipeCard
                    key={rcp._id}
                    recipe={rcp}
                    onEdit={(r) => {
                      store.setSelectedRecipe(r);
                      store.setActiveModal('EDIT_RECIPE');
                    }}
                    onView={(r) => {
                      store.setSelectedRecipe(r);
                      store.setActiveModal('VIEW_RECIPE');
                    }}
                  />
                ))
              )}
            </div>
          </div>
        ) : (
          /* Food Waste Audit Table Tab */
          <FoodWasteAuditTable
            logs={wasteLogs}
            summary={wasteSummary}
            selectedFilter={wasteFilter}
            onFilterChange={(filter) => {
              store.setWasteTypeFilter(filter);
              fetchWasteAudit();
            }}
            loading={loading}
          />
        )}
      </div>

      {/* Recipe BOM Editor Modal */}
      <RecipeBomEditorModal
        isOpen={activeModal === 'EDIT_RECIPE'}
        recipe={selectedRecipe}
        menuItems={menuItems}
        onClose={() => store.setActiveModal(null)}
        onSave={handleSaveRecipe}
        loading={loading}
      />

      {/* Read-only Recipe SOP */}
      <RecipeSopViewModal
        isOpen={activeModal === 'VIEW_RECIPE'}
        recipe={selectedRecipe}
        onClose={() => store.setActiveModal(null)}
      />

      {/* Food Waste Log Modal */}
      <FoodWasteLogModal
        isOpen={activeModal === 'LOG_WASTE'}
        onClose={() => store.setActiveModal(null)}
        onSave={handleSaveWaste}
        loading={loading}
      />
    </div>
  );
};
