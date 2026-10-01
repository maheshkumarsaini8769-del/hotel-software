import {
  IRecipeUI,
  IRecipeMetricsUI,
  IFoodWasteLogUI,
  IFoodWasteSummaryUI,
} from './types';

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

export class RecipeCostingStore {
  private state: IRecipeCostingState = {
    recipes: [],
    selectedRecipe: null,
    metrics: {
      totalRecipesCount: 0,
      highCostRecipesCount: 0,
      averageFoodCostPercentage: 0,
      targetFoodCostPercentage: 32,
    },
    wasteLogs: [],
    wasteSummary: {
      totalEntriesCount: 0,
      totalLossAmount: 0,
      daysAudited: 30,
      wasteBreakdownByType: {},
      lossByShift: {},
    },
    activeTab: 'RECIPES',
    filterStatus: 'ALL',
    wasteTypeFilter: 'ALL',
    searchQuery: '',
    activeModal: null,
    loading: false,
    error: null,
  };

  private listeners: RecipeCostingListener[] = [];

  getState(): IRecipeCostingState {
    return { ...this.state, recipes: [...this.state.recipes], wasteLogs: [...this.state.wasteLogs] };
  }

  subscribe(listener: RecipeCostingListener): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  setRecipes(recipes: IRecipeUI[], metrics?: Partial<IRecipeMetricsUI>): void {
    this.state.recipes = recipes;
    if (metrics) {
      this.state.metrics = { ...this.state.metrics, ...metrics };
    }
    this.notify();
  }

  setSelectedRecipe(recipe: IRecipeUI | null): void {
    this.state.selectedRecipe = recipe;
    this.notify();
  }

  setWasteLogs(logs: IFoodWasteLogUI[], summary?: Partial<IFoodWasteSummaryUI>): void {
    this.state.wasteLogs = logs;
    if (summary) {
      this.state.wasteSummary = { ...this.state.wasteSummary, ...summary };
    }
    this.notify();
  }

  setActiveTab(tab: 'RECIPES' | 'WASTE_AUDIT'): void {
    this.state.activeTab = tab;
    this.notify();
  }

  setFilterStatus(status: 'ALL' | 'OPTIMAL' | 'HIGH_ALERT'): void {
    this.state.filterStatus = status;
    this.notify();
  }

  setWasteTypeFilter(filter: string): void {
    this.state.wasteTypeFilter = filter;
    this.notify();
  }

  setSearchQuery(q: string): void {
    this.state.searchQuery = q;
    this.notify();
  }

  setActiveModal(modal: 'EDIT_RECIPE' | 'LOG_WASTE' | 'VIEW_RECIPE' | null): void {
    this.state.activeModal = modal;
    this.notify();
  }

  setLoading(loading: boolean): void {
    this.state.loading = loading;
    this.notify();
  }

  setError(error: string | null): void {
    this.state.error = error;
    this.notify();
  }
}
