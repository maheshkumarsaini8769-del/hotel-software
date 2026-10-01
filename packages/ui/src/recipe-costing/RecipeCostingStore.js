"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeCostingStore = void 0;
class RecipeCostingStore {
    state = {
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
    listeners = [];
    getState() {
        return { ...this.state, recipes: [...this.state.recipes], wasteLogs: [...this.state.wasteLogs] };
    }
    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.getState());
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    notify() {
        const currentState = this.getState();
        this.listeners.forEach((listener) => listener(currentState));
    }
    setRecipes(recipes, metrics) {
        this.state.recipes = recipes;
        if (metrics) {
            this.state.metrics = { ...this.state.metrics, ...metrics };
        }
        this.notify();
    }
    setSelectedRecipe(recipe) {
        this.state.selectedRecipe = recipe;
        this.notify();
    }
    setWasteLogs(logs, summary) {
        this.state.wasteLogs = logs;
        if (summary) {
            this.state.wasteSummary = { ...this.state.wasteSummary, ...summary };
        }
        this.notify();
    }
    setActiveTab(tab) {
        this.state.activeTab = tab;
        this.notify();
    }
    setFilterStatus(status) {
        this.state.filterStatus = status;
        this.notify();
    }
    setWasteTypeFilter(filter) {
        this.state.wasteTypeFilter = filter;
        this.notify();
    }
    setSearchQuery(q) {
        this.state.searchQuery = q;
        this.notify();
    }
    setActiveModal(modal) {
        this.state.activeModal = modal;
        this.notify();
    }
    setLoading(loading) {
        this.state.loading = loading;
        this.notify();
    }
    setError(error) {
        this.state.error = error;
        this.notify();
    }
}
exports.RecipeCostingStore = RecipeCostingStore;
