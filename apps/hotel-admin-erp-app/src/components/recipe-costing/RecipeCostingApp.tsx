import React, { useState, useEffect, useCallback } from 'react';
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
import { FoodWasteLogModal } from './FoodWasteLogModal';
import { FoodWasteAuditTable } from './FoodWasteAuditTable';

interface RecipeCostingAppProps {
  apiBaseUrl?: string;
  token?: string;
}

export const RecipeCostingApp: React.FC<RecipeCostingAppProps> = ({
  apiBaseUrl = 'http://localhost:5000/api/v1',
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
      if (res.ok) {
        const data = await res.json();
        store.setRecipes(data.recipes, data.metrics);
      }
    } catch {
      // Fallback sample data in dev
    } finally {
      store.setLoading(false);
    }
  }, [apiBaseUrl, authHeaders, store]);

  // Fetch Food Waste Logs
  const fetchWasteAudit = useCallback(async () => {
    try {
      const url = `${apiBaseUrl}/recipe-costing/waste/audit?wasteType=${wasteFilter}`;
      const res = await fetch(url, { credentials: 'include', headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        store.setWasteLogs(data.logs, data.summary);
      }
    } catch {
      // Fallback
    }
  }, [apiBaseUrl, authHeaders, store, wasteFilter]);

  // Fetch Menu Items
  const fetchMenuItems = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/pos/menu`, { credentials: 'include', headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const items = data.menuItems || data.items || [];
        setMenuItems(items);
      }
    } catch {
      setMenuItems([
        { _id: 'item-1', name: 'Signature Dum Biryani', basePrice: 280 },
        { _id: 'item-2', name: 'Butter Chicken Gravy', basePrice: 320 },
        { _id: 'item-3', name: 'Paneer Tikka Masala', basePrice: 240 },
        { _id: 'item-4', name: 'Dal Makhani Heritage', basePrice: 190 },
      ]);
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
      store.setLoading(true);
      const res = await fetch(`${apiBaseUrl}/recipe-costing/recipes`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        store.setActiveModal(null);
        fetchRecipes();
      }
    } catch {
      store.setActiveModal(null);
    } finally {
      store.setLoading(false);
    }
  };

  // Handle Log Food Waste
  const handleSaveWaste = async (payload: ILogWastePayload) => {
    try {
      store.setLoading(true);
      const res = await fetch(`${apiBaseUrl}/recipe-costing/waste`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        store.setActiveModal(null);
        fetchWasteAudit();
      }
    } catch {
      store.setActiveModal(null);
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
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col font-sans select-none">
      {/* Header */}
      <RecipeCostingHeader
        metrics={metrics}
        wasteSummary={wasteSummary}
        activeTab={activeTab}
        onTabChange={(tab) => store.setActiveTab(tab)}
        onNewRecipeClick={() => {
          store.setSelectedRecipe(null);
          store.setActiveModal('EDIT_RECIPE');
        }}
        onLogWasteClick={() => store.setActiveModal('LOG_WASTE')}
        onRefreshClick={() => {
          fetchRecipes();
          fetchWasteAudit();
        }}
        loading={loading}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 p-6 max-w-[1700px] w-full mx-auto">
        {activeTab === 'RECIPES' ? (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                  🔍
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => store.setSearchQuery(e.target.value)}
                  placeholder="Search standard recipe or recipe code..."
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 outline-none focus:border-amber-400"
                />
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                Showing {filteredRecipes.length} of {recipes.length} standard recipes
              </span>
            </div>

            {/* Recipe Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRecipes.length === 0 ? (
                <div className="col-span-full py-16 text-center text-zinc-500 text-sm flex flex-col items-center gap-3">
                  <span className="text-3xl">📋</span>
                  <span>No recipe specifications found matching your query</span>
                  <button
                    type="button"
                    onClick={() => {
                      store.setSelectedRecipe(null);
                      store.setActiveModal('EDIT_RECIPE');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
                  >
                    + Create First Recipe BOM
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
