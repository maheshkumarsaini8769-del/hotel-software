import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, getStoredHotelId } from '../../config/api';
import {
  FolderTree,
  UtensilsCrossed,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  ChefHat,
  Flame,
  Clock,
  Sparkles,
  Layers,
  ArrowUpDown,
  Check,
  X,
  RefreshCw,
  Tag,
  DollarSign,
  Grid,
  List,
  Info,
  BookOpen,
} from 'lucide-react';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  itemCount: number;
  isActive: boolean;
  kitchenStationId?: string;
  kitchenStationName?: string;
  imageUrl?: string;
}

export interface MenuItemData {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  kitchenStationId?: string;
  kitchenStationName?: string;
  foodType: string;
  price: number;
  basePrice: number;
  isAvailable: boolean;
  description?: string;
  prepTimeMinutes: number;
  images: string[];
}

interface MenuCatalogManagerAppProps {
  isDark?: boolean;
  hotelId?: string;
  initialTab?: 'CATEGORIES' | 'ITEMS' | 'STOCK_86' | 'RECIPES';
}

export const MenuCatalogManagerApp: React.FC<MenuCatalogManagerAppProps> = ({
  isDark = true,
  hotelId = getStoredHotelId(),
  initialTab = 'CATEGORIES',
}) => {
  const [activeTab, setActiveTab] = useState<'CATEGORIES' | 'ITEMS' | 'STOCK_86' | 'RECIPES'>(initialTab);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [items, setItems] = useState<MenuItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('ALL');
  const [foodTypeFilter, setFoodTypeFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryStation, setCategoryStation] = useState('Executive Chef Hot Pass');
  const [categoryDisplayOrder, setCategoryDisplayOrder] = useState('1');

  // Dish Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [dishName, setDishName] = useState('');
  const [dishCategoryId, setDishCategoryId] = useState('');
  const [dishPrice, setDishPrice] = useState('250');
  const [dishFoodType, setDishFoodType] = useState<'VEG' | 'NON_VEG'>('VEG');
  const [dishDescription, setDishDescription] = useState('');
  const [dishPrepTime, setDishPrepTime] = useState('15');
  const [dishStation, setDishStation] = useState('Executive Chef Hot Pass');

  // Recipes & BOM Costing State
  const [recipes, setRecipes] = useState([
    {
      id: 'rc-1',
      dishName: 'Paneer Butter Masala',
      category: 'Main Course Veg',
      portion: '1 Full Plate (350g)',
      sellingPrice: 320,
      cogsCost: 85,
      foodCostPercent: 26.5,
      targetCostPercent: 30.0,
      ingredients: [
        { name: 'Fresh Malai Paneer', qty: '200g', cost: 44 },
        { name: 'Amul Butter & Cream', qty: '50g', cost: 22 },
        { name: 'Makhani Tomato Gravy', qty: '120g', cost: 14 },
        { name: 'Garam Masala & Kasuri Methi', qty: '15g', cost: 5 },
      ],
      chefInCharge: 'Chef Anand Sharma',
      status: 'OPTIMAL',
    },
    {
      id: 'rc-2',
      dishName: 'Woodfired Margherita Pizza',
      category: 'Woodfired Pizzas',
      portion: '11-Inch Artisan (8 Slices)',
      sellingPrice: 350,
      cogsCost: 68,
      foodCostPercent: 19.4,
      targetCostPercent: 25.0,
      ingredients: [
        { name: 'Fermented Sourdough Dough', qty: '240g', cost: 12 },
        { name: 'Fresh Fior di Latte Mozzarella', qty: '120g', cost: 36 },
        { name: 'San Marzano Tomato Sauce', qty: '80g', cost: 14 },
        { name: 'Fresh Genovese Basil & EVOO', qty: '15ml', cost: 6 },
      ],
      chefInCharge: 'Chef Priya Mehta',
      status: 'HIGH_MARGIN',
    },
    {
      id: 'rc-3',
      dishName: 'Dal Makhani Heritage',
      category: 'Main Course Veg',
      portion: '1 Bowl (400g)',
      sellingPrice: 280,
      cogsCost: 52,
      foodCostPercent: 18.5,
      targetCostPercent: 22.0,
      ingredients: [
        { name: 'Black Urad & Rajma', qty: '150g', cost: 18 },
        { name: 'Desi White Butter', qty: '60g', cost: 20 },
        { name: 'Dairy Fresh Cream', qty: '40ml', cost: 9 },
        { name: 'Spices & Ginger Garlic', qty: '20g', cost: 5 },
      ],
      chefInCharge: 'Chef Anand Sharma',
      status: 'HIGH_MARGIN',
    },
    {
      id: 'rc-4',
      dishName: 'Tandoori Murgh (Full)',
      category: 'Tandoor & Starters',
      portion: '1 Whole Bird (4 Quarters)',
      sellingPrice: 450,
      cogsCost: 145,
      foodCostPercent: 32.2,
      targetCostPercent: 32.0,
      ingredients: [
        { name: 'Fresh Whole Chicken', qty: '850g', cost: 110 },
        { name: 'Hung Curd Marinade', qty: '100g', cost: 16 },
        { name: 'Kashmiri Chili & Degi Mirch', qty: '25g', cost: 10 },
        { name: 'Mustard Oil & Lemon', qty: '30ml', cost: 9 },
      ],
      chefInCharge: 'Chef Vikram Rawat',
      status: 'MONITOR',
    },
    {
      id: 'rc-5',
      dishName: 'Virgin Mojito Mint Cooler',
      category: 'Beverages & Mocktails',
      portion: '350ml Tall Glass',
      sellingPrice: 180,
      cogsCost: 22,
      foodCostPercent: 12.2,
      targetCostPercent: 18.0,
      ingredients: [
        { name: 'Fresh Garden Mint Sprigs', qty: '20g', cost: 4 },
        { name: 'Fresh Lime Wedges', qty: '2 pcs', cost: 6 },
        { name: 'Craft Simple Cane Syrup', qty: '30ml', cost: 4 },
        { name: 'Carbonated Club Soda', qty: '200ml', cost: 8 },
      ],
      chefInCharge: 'Mixologist Rohit Sen',
      status: 'HIGH_MARGIN',
    },
  ]);
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<any | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch Categories & Menu Items
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catResult, itemResult] = await Promise.allSettled([
        apiFetch(`/menu-catalog/categories?hotelId=${hotelId}`),
        apiFetch(`/menu-catalog/items?hotelId=${hotelId}`),
      ]);

      if (catResult.status === 'fulfilled' && catResult.value.ok) {
        const catBody = await catResult.value.json().catch(() => null);
        if (catBody?.success && Array.isArray(catBody.data)) {
          setCategories(catBody.data);
          try {
            localStorage.setItem('spicehub_menu_categories', JSON.stringify(catBody.data));
          } catch (_) {}
        }
      }

      if (itemResult.status === 'fulfilled' && itemResult.value.ok) {
        const itemBody = await itemResult.value.json().catch(() => null);
        if (itemBody?.success && Array.isArray(itemBody.data)) {
          setItems(itemBody.data);
          try {
            localStorage.setItem('spicehub_menu_items', JSON.stringify(itemBody.data));
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn('API error, using cached storage:', err);
      try {
        const cachedCats = localStorage.getItem('spicehub_menu_categories');
        if (cachedCats) setCategories(JSON.parse(cachedCats));
        const cachedItems = localStorage.getItem('spicehub_menu_items');
        if (cachedItems) setItems(JSON.parse(cachedItems));
      } catch (_) {}
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [hotelId]);

  // Derived KPIs
  const totalCategoriesCount = categories.length;
  const totalItemsCount = items.length;
  const inStockItemsCount = items.filter((i) => i.isAvailable !== false).length;
  const outOfStock86Count = items.filter((i) => i.isAvailable === false).length;

  // Filtered Items
  const filteredDishes = useMemo(() => {
    return items.filter((dish) => {
      const matchesCat =
        selectedCatFilter === 'ALL' ||
        dish.categoryId === selectedCatFilter ||
        dish.category.toLowerCase() === selectedCatFilter.toLowerCase();
      const matchesFoodType =
        foodTypeFilter === 'ALL' ||
        (foodTypeFilter === 'VEG' && dish.foodType === 'VEG') ||
        (foodTypeFilter === 'NON_VEG' && dish.foodType !== 'VEG');
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        dish.name.toLowerCase().includes(q) ||
        dish.category.toLowerCase().includes(q) ||
        (dish.description || '').toLowerCase().includes(q);
      return matchesCat && matchesFoodType && matchesSearch;
    });
  }, [items, selectedCatFilter, foodTypeFilter, searchQuery]);

  // ============================================================================
  // CATEGORY ACTIONS (CREATE, EDIT, DELETE)
  // ============================================================================

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryStation('Executive Chef Hot Pass');
    setCategoryDisplayOrder(String(categories.length + 1));
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryStation(cat.kitchenStationName || 'Executive Chef Hot Pass');
    setCategoryDisplayOrder(String(cat.displayOrder || 1));
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    const payload = {
      name: categoryName.trim(),
      displayOrder: Number(categoryDisplayOrder) || categories.length + 1,
      hotelId,
    };

    try {
      if (editingCategory) {
        // Update
        const res = await apiFetch(`/menu-catalog/categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success) {
            setCategories((prev) =>
              prev.map((c) => (c.id === editingCategory.id ? { ...c, ...body.data } : c))
            );
            showToast(`✓ Category "${categoryName}" updated successfully!`);
          }
        }
      } else {
        // Create
        const res = await apiFetch(`/menu-catalog/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success) {
            setCategories((prev) => [...prev, body.data]);
            showToast(`✓ New Category "${categoryName}" added! Now available in customer menu.`);
          }
        }
      }
      setIsCategoryModalOpen(false);
      // Sync local storage so customer app gets it immediately
      fetchData();
    } catch (err: any) {
      showToast(`Error saving category: ${err.message}`);
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"? Dishes under this category will also be removed.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/menu-catalog/categories/${cat.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
        setItems((prev) => prev.filter((i) => i.categoryId !== cat.id && i.category.toLowerCase() !== cat.name.toLowerCase()));
        showToast(`✓ Category "${cat.name}" removed successfully!`);
      }
    } catch (err: any) {
      showToast(`Error deleting category: ${err.message}`);
    }
  };

  // ============================================================================
  // DISH ITEM ACTIONS (CREATE, EDIT, DELETE, TOGGLE-86)
  // ============================================================================

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setDishName('');
    setDishCategoryId(categories[0]?.id || 'cat-mains');
    setDishPrice('250');
    setDishFoodType('VEG');
    setDishDescription('');
    setDishPrepTime('15');
    setDishStation('Executive Chef Hot Pass');
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: MenuItemData) => {
    setEditingItem(item);
    setDishName(item.name);
    setDishCategoryId(item.categoryId || categories[0]?.id || '');
    setDishPrice(String(item.price));
    setDishFoodType(item.foodType === 'NON_VEG' ? 'NON_VEG' : 'VEG');
    setDishDescription(item.description || '');
    setDishPrepTime(String(item.prepTimeMinutes || 15));
    setDishStation(item.kitchenStationName || 'Executive Chef Hot Pass');
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim()) {
      alert('Please enter a dish name');
      return;
    }

    const matchedCat = categories.find((c) => c.id === dishCategoryId) || categories[0];
    const payload = {
      name: dishName.trim(),
      categoryId: matchedCat?.id || 'cat-mains',
      category: matchedCat?.name || 'Main Course',
      price: Number(dishPrice) || 200,
      basePrice: Number(dishPrice) || 200,
      foodType: dishFoodType,
      description: dishDescription.trim(),
      prepTimeMinutes: Number(dishPrepTime) || 15,
      hotelId,
      isAvailable: true,
    };

    try {
      if (editingItem) {
        const res = await apiFetch(`/menu-catalog/items/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success) {
            setItems((prev) =>
              prev.map((i) => (i.id === editingItem.id ? { ...i, ...body.data } : i))
            );
            showToast(`✓ Dish "${dishName}" updated successfully!`);
          }
        }
      } else {
        const res = await apiFetch(`/menu-catalog/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success) {
            setItems((prev) => [body.data, ...prev]);
            showToast(`✓ Dish "${dishName}" added to menu catalog!`);
          }
        }
      }
      setIsItemModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(`Error saving dish: ${err.message}`);
    }
  };

  const handleDeleteItem = async (item: MenuItemData) => {
    if (!window.confirm(`Are you sure you want to delete dish "${item.name}"?`)) {
      return;
    }

    try {
      const res = await apiFetch(`/menu-catalog/items/${item.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        showToast(`✓ Dish "${item.name}" deleted from menu!`);
      }
    } catch (err: any) {
      showToast(`Error deleting dish: ${err.message}`);
    }
  };

  const handleToggle86 = async (item: MenuItemData) => {
    try {
      const res = await apiFetch(`/menu-catalog/items/${item.id}/toggle-86`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          const nextState = body.data.isAvailable;
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, isAvailable: nextState } : i))
          );
          showToast(
            nextState
              ? `🟢 "${item.name}" is now LIVE in Kitchen & Customer Menu!`
              : `🔴 "${item.name}" marked 86 OUT OF STOCK!`
          );
        }
      }
    } catch (err: any) {
      showToast(`Error toggling stock: ${err.message}`);
    }
  };

  return (
    <div className={`space-y-6 max-w-7xl mx-auto pb-12 transition-colors duration-200 ${
      isDark ? 'text-slate-100' : 'text-slate-800'
    }`}>
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400/40 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toast}</span>
        </div>
      )}

      {/* 1. TOP HEADER & KPI SUMMARY */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white text-xl shadow-lg shadow-orange-950/30">
                🍽️
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  <span>Menu & Category Management Studio</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live Sync
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Add, edit, remove customer menu categories, dish pricing, and 1-click 86 kitchen out-of-stock items.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleOpenAddCategory}
              className="px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 text-amber-400 text-xs font-black transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Category</span>
            </button>
            <button
              onClick={handleOpenAddItem}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-indigo-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Dish</span>
            </button>
          </div>
        </div>

        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {/* Categories */}
          <div className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#151926] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-1">
              <span>Categories</span>
              <FolderTree className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black">{totalCategoriesCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Synced across QR & Waiter</div>
          </div>

          {/* Dishes */}
          <div className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#151926] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs text-indigo-400 font-bold mb-1">
              <span>Total Dishes</span>
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black">{totalItemsCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">In Food Catalog</div>
          </div>

          {/* In Stock */}
          <div className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#151926] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-1">
              <span>Available in Kitchen</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-emerald-400">{inStockItemsCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Ready for instant ordering</div>
          </div>

          {/* 86 Out of Stock */}
          <div className={`p-4 rounded-2xl border ${
            isDark ? 'bg-[#151926] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs text-rose-400 font-bold mb-1">
              <span>86 Out of Stock</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-rose-400">{outOfStock86Count}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Blocked from ordering</div>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === 'CATEGORIES'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/20'
              : isDark
              ? 'bg-[#121622] text-slate-400 hover:text-white border border-slate-800'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>🏷️ Categories Management ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ITEMS')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === 'ITEMS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/30'
              : isDark
              ? 'bg-[#121622] text-slate-400 hover:text-white border border-slate-800'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>🍽️ All Food Items ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('STOCK_86')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === 'STOCK_86'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/30'
              : isDark
              ? 'bg-[#121622] text-slate-400 hover:text-white border border-slate-800'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>⚡ 86 Kitchen Stock Control ({outOfStock86Count})</span>
        </button>

        <button
          onClick={() => setActiveTab('RECIPES')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === 'RECIPES'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-950/30'
              : isDark
              ? 'bg-[#121622] text-slate-400 hover:text-white border border-slate-800'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>📜 Recipes & BOM Costing ({recipes.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB 1: CATEGORIES MANAGEMENT                                           */}
      {/* ========================================================================= */}
      {activeTab === 'CATEGORIES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black flex items-center gap-2">
                <span>Active Menu Categories</span>
                <span className="text-xs text-slate-400 font-normal">
                  (Changes reflect in Customer QR menu & Waiter floor app)
                </span>
              </h2>
            </div>
            <button
              onClick={handleOpenAddCategory}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs hover:bg-amber-500 hover:text-slate-950 transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map((cat, idx) => {
              const count = items.filter(
                (it) => it.categoryId === cat.id || it.category.toLowerCase() === cat.name.toLowerCase()
              ).length;
              return (
                <div
                  key={cat.id}
                  className={`p-5 rounded-3xl border transition-all hover:border-amber-500/50 hover:shadow-lg relative group ${
                    isDark ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center text-lg font-black shrink-0">
                        📁
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-white group-hover:text-amber-400 transition">
                          {cat.name}
                        </h3>
                        <span className="text-[10px] text-slate-400">Order: #{cat.displayOrder || idx + 1}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Edit Category Name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/60 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Total Dishes:</span>
                      <span className="font-bold text-white px-2 py-0.5 rounded-md bg-slate-800/60">
                        {count} items
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Kitchen Pass:</span>
                      <span className="font-bold text-orange-400">
                        {cat.kitchenStationName || 'Hot Pass Station'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Status:</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Active on Menu</span>
                      </span>
                    </div>
                  </div>

                  {/* Filter dishes in this category button */}
                  <button
                    onClick={() => {
                      setSelectedCatFilter(cat.name);
                      setActiveTab('ITEMS');
                    }}
                    className="w-full mt-4 py-2 rounded-xl text-center text-xs font-bold bg-slate-800/40 hover:bg-amber-500/15 hover:text-amber-300 border border-white/5 transition"
                  >
                    View {count} Dishes →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB 2: DISHES & ITEMS CATALOG                                          */}
      {/* ========================================================================= */}
      {activeTab === 'ITEMS' && (
        <div className="space-y-4">
          {/* Search, Category Filter Pills & Food Type */}
          <div className={`p-4 rounded-3xl border space-y-3 ${
            isDark ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dishes (e.g. Paneer, Biryani, Tikka)..."
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Veg / Non-Veg Toggle & Add Dish */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center p-1 rounded-xl border text-xs font-bold ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  <button
                    onClick={() => setFoodTypeFilter('ALL')}
                    className={`px-3 py-1 rounded-lg transition ${
                      foodTypeFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFoodTypeFilter('VEG')}
                    className={`px-3 py-1 rounded-lg transition ${
                      foodTypeFilter === 'VEG' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    Pure Veg
                  </button>
                  <button
                    onClick={() => setFoodTypeFilter('NON_VEG')}
                    className={`px-3 py-1 rounded-lg transition ${
                      foodTypeFilter === 'NON_VEG' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-rose-400'
                    }`}
                  >
                    Non-Veg
                  </button>
                </div>

                <button
                  onClick={handleOpenAddItem}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ New Dish</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills (Dynamically populated from categories!) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 custom-scrollbar">
              <button
                onClick={() => setSelectedCatFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition ${
                  selectedCatFilter === 'ALL'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-500 text-white'
                    : isDark
                    ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Categories ({items.length})
              </button>
              {categories.map((c) => {
                const count = items.filter(
                  (it) => it.categoryId === c.id || it.category.toLowerCase() === c.name.toLowerCase()
                ).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCatFilter(c.name)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center gap-1 ${
                      selectedCatFilter === c.name
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : isDark
                        ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDishes.map((dish) => {
              const isAvailable = dish.isAvailable !== false;
              return (
                <div
                  key={dish.id}
                  className={`p-4 rounded-3xl border transition-all hover:border-indigo-500/50 flex flex-col justify-between ${
                    isDark ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                  } ${!isAvailable ? 'opacity-75 ring-1 ring-rose-500/40' : ''}`}
                >
                  <div>
                    {/* Image & Food Type Pill */}
                    <div className="relative h-36 rounded-2xl overflow-hidden mb-3 bg-slate-900">
                      <img
                        src={dish.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'}
                        alt={dish.name}
                        className={`w-full h-full object-cover transition-transform duration-300 hover:scale-105 ${
                          !isAvailable ? 'grayscale' : ''
                        }`}
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          dish.foodType === 'NON_VEG'
                            ? 'bg-rose-950/90 text-rose-300 border border-rose-500/50'
                            : 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
                        }`}>
                          {dish.foodType === 'NON_VEG' ? '🔴 Non-Veg' : '🟢 Pure Veg'}
                        </span>
                      </div>

                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          isAvailable
                            ? 'bg-emerald-500 text-slate-950 shadow-md'
                            : 'bg-rose-600 text-white font-black'
                        }`}>
                          {isAvailable ? 'In Stock' : '86 Out of Stock'}
                        </span>
                      </div>

                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-bold text-slate-200">
                        {dish.category}
                      </div>
                    </div>

                    {/* Title & Price */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-black text-sm text-white line-clamp-1">{dish.name}</h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                          {dish.description || 'Delicious freshly prepared recipe with authentic herbs and spices.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Controls */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-black text-amber-400">
                        ₹{dish.price}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{dish.prepTimeMinutes || 15} mins</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 1-Click 86 Toggle */}
                      <button
                        onClick={() => handleToggle86(dish)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1 ${
                          isAvailable
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white'
                        }`}
                        title="Toggle Out of Stock status"
                      >
                        {isAvailable ? '⚡ Mark 86 Out of Stock' : '✓ Restock (Make Available)'}
                      </button>

                      <button
                        onClick={() => handleOpenEditItem(dish)}
                        className="p-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                        title="Edit Dish Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteItem(dish)}
                        className="p-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete Dish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB 3: 86 KITCHEN STOCK CONTROL                                        */}
      {/* ========================================================================= */}
      {activeTab === 'STOCK_86' && (
        <div className={`p-6 rounded-3xl border space-y-4 ${
          isDark ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <span>Kitchen 86 Out-of-Stock Board</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                These dishes are automatically blocked from customer ordering until restocked by chef.
              </p>
            </div>
          </div>

          {outOfStock86Count === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-white">All Menu Items Are Available!</div>
              <div className="text-xs text-slate-400">Kitchen has complete raw material inventory for all dishes.</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {items
                .filter((it) => it.isAvailable === false)
                .map((dish) => (
                  <div key={dish.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                        <img src={dish.images?.[0]} alt={dish.name} className="w-full h-full object-cover grayscale" />
                      </div>
                      <div>
                        <div className="font-black text-sm text-white">{dish.name}</div>
                        <div className="text-xs text-slate-400">Category: {dish.category} • Price: ₹{dish.price}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggle86(dish)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                    >
                      ✓ Restock & Make Available
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5B. TAB 4: RECIPES & BOM COSTING                                          */}
      {/* ========================================================================= */}
      {activeTab === 'RECIPES' && (
        <div className={`p-6 rounded-3xl border space-y-6 ${
          isDark ? 'bg-[#0f131d] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black flex items-center gap-2 text-purple-400">
                  <BookOpen className="w-5 h-5" />
                  <span>Recipe Costing & Bill of Materials (BOM)</span>
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Auto COGS Calculation
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Link finished menu items to raw ingredients, track food cost % vs selling price and prevent margin erosion.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 text-xs">
                <span className="text-slate-400 text-[10px] block font-bold">AVG FOOD COST</span>
                <span className="text-emerald-400 font-black">21.8% (Target: &lt; 30%)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((rc) => {
              const isHighMargin = rc.foodCostPercent < 25;
              const isOptimal = rc.foodCostPercent >= 25 && rc.foodCostPercent <= 30;
              return (
                <div
                  key={rc.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isDark ? 'bg-[#141824] border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-800 text-slate-300">
                        {rc.category}
                      </span>
                      <h3 className="text-base font-black mt-2">{rc.dishName}</h3>
                      <p className="text-[11px] text-slate-400">{rc.portion}</p>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        isHighMargin
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isOptimal
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {rc.status}
                    </span>
                  </div>

                  {/* Pricing & Cost Matrix */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">SALE PRICE</span>
                      <span className="text-sm font-black text-slate-100">₹{rc.sellingPrice}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">RAW COGS</span>
                      <span className="text-sm font-black text-amber-400">₹{rc.cogsCost}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">FOOD COST</span>
                      <span
                        className={`text-sm font-black ${
                          isHighMargin ? 'text-emerald-400' : isOptimal ? 'text-blue-400' : 'text-amber-400'
                        }`}
                      >
                        {rc.foodCostPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Ingredients Bill of Materials List */}
                  <div className="mt-4 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Recipe Ingredients (BOM):
                    </span>
                    <div className="space-y-1 text-xs">
                      {rc.ingredients.map((ing, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1 border-b border-slate-800/40 text-[11px]"
                        >
                          <span className="text-slate-300">
                            {ing.name} <span className="text-slate-400">({ing.qty})</span>
                          </span>
                          <span className="font-mono text-slate-400">₹{ing.cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Chef: <strong className="text-slate-200">{rc.chefInCharge}</strong></span>
                    <span className="font-bold text-emerald-400">
                      Margin: ₹{rc.sellingPrice - rc.cogsCost}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: ADD / EDIT CATEGORY                                             */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className={`max-w-md w-full rounded-3xl border p-6 space-y-5 shadow-2xl ${
            isDark ? 'bg-[#121622] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {editingCategory ? 'Edit Menu Category' : 'Create New Menu Category'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Manage categories visible to customers</p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Italian Pizza & Pasta"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={categoryDisplayOrder}
                    onChange={(e) => setCategoryDisplayOrder(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Kitchen Station</label>
                  <select
                    value={categoryStation}
                    onChange={(e) => setCategoryStation(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Executive Chef Hot Pass">Hot Pass Pass</option>
                    <option value="Tandoor & Starters">Tandoor Station</option>
                    <option value="Main Curry & Gravy">Main Curry Station</option>
                    <option value="Beverage & Bar Counter">Beverage Counter</option>
                    <option value="Bakery & Desserts">Bakery & Desserts</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition"
                >
                  {editingCategory ? 'Update Category' : 'Save & Publish Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: ADD / EDIT DISH ITEM                                            */}
      {/* ========================================================================= */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className={`max-w-lg w-full rounded-3xl border p-6 space-y-5 shadow-2xl ${
            isDark ? 'bg-[#121622] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {editingItem ? 'Edit Food Item / Dish' : 'Add New Food Item'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Configure item name, category and pricing</p>
                </div>
              </div>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Dish Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kadai Paneer Masala"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Category *</label>
                  <select
                    value={dishCategoryId}
                    onChange={(e) => setDishCategoryId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="280"
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Dietary Type</label>
                  <select
                    value={dishFoodType}
                    onChange={(e) => setDishFoodType(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="VEG">🟢 Pure Veg</option>
                    <option value="NON_VEG">🔴 Non-Veg</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Prep Time (Mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={dishPrepTime}
                    onChange={(e) => setDishPrepTime(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Description / Ingredients</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Fresh cottage cheese simmered in spiced tomato gravy."
                  value={dishDescription}
                  onChange={(e) => setDishDescription(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md transition"
                >
                  {editingItem ? 'Update Dish' : 'Save & Publish Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
