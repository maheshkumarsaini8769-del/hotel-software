import { IRecipeUI, IRecipeMetricsUI, IFoodWasteLogUI, IFoodWasteSummaryUI } from './types';
export interface IRecipeCostingState {
    recipes: IRecipeUI[];
    selectedRecipe: IRecipeUI | null;
    metrics: IRecipeMetricsUI;
    wasteLogs: IFoodWasteLogUI[];
    wasteSummary: IFoodWasteSummaryUI;
    activeTab: 'RECIPES' | 'WASTE_AUDIT';
    filterStatus: 'ALL' | 'OPTIMAL' | 'HIGH_ALERT';
    wasteTypeFilter: string;
    searchQuery: string;
    activeModal: 'EDIT_RECIPE' | 'LOG_WASTE' | 'VIEW_RECIPE' | null;
    loading: boolean;
    error: string | null;
}
export type RecipeCostingListener = (state: IRecipeCostingState) => void;
export declare class RecipeCostingStore {
    private state;
    private listeners;
    getState(): IRecipeCostingState;
    subscribe(listener: RecipeCostingListener): () => void;
    private notify;
    setRecipes(recipes: IRecipeUI[], metrics?: Partial<IRecipeMetricsUI>): void;
    setSelectedRecipe(recipe: IRecipeUI | null): void;
    setWasteLogs(logs: IFoodWasteLogUI[], summary?: Partial<IFoodWasteSummaryUI>): void;
    setActiveTab(tab: 'RECIPES' | 'WASTE_AUDIT'): void;
    setFilterStatus(status: 'ALL' | 'OPTIMAL' | 'HIGH_ALERT'): void;
    setWasteTypeFilter(filter: string): void;
    setSearchQuery(q: string): void;
    setActiveModal(modal: 'EDIT_RECIPE' | 'LOG_WASTE' | 'VIEW_RECIPE' | null): void;
    setLoading(loading: boolean): void;
    setError(error: string | null): void;
}
