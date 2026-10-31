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
  Camera,
  Upload,
  Image as ImageIcon,
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
  isDark = false,
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
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockCatFilter, setStockCatFilter] = useState('ALL');

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
  const [dishImage, setDishImage] = useState<string>('');
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const galleryInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);

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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingImage(true);
    try {
      const compressed = await compressImage(file);
      setDishImage(compressed);
      showToast('✓ Dish photo attached!');
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Failed to process image. Please try another image.');
    } finally {
      setIsCompressingImage(false);
      e.target.value = '';
    }
  };

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setDishName('');
    setDishCategoryId(categories[0]?.id || 'cat-mains');
    setDishPrice('250');
    setDishFoodType('VEG');
    setDishDescription('');
    setDishPrepTime('15');
    setDishStation('Executive Chef Hot Pass');
    setDishImage('');
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
    setDishImage(item.images?.[0] || '');
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
      images: dishImage ? [dishImage] : [],
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
        } else {
          setItems((prev) =>
            prev.map((i) => (i.id === editingItem.id ? { ...i, ...payload } : i))
          );
          showToast(`✓ Dish "${dishName}" updated!`);
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
        } else {
          const newItem: MenuItemData = {
            id: 'm-' + Date.now(),
            name: payload.name,
            categoryId: payload.categoryId,
            category: payload.category,
            foodType: payload.foodType,
            price: payload.price,
            basePrice: payload.basePrice,
            isAvailable: true,
            description: payload.description,
            prepTimeMinutes: payload.prepTimeMinutes,
            images: payload.images.length > 0 ? payload.images : ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'],
          };
          setItems((prev) => [newItem, ...prev]);
          showToast(`✓ Dish "${dishName}" added!`);
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-slate-900">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl bg-slate-900 text-white font-semibold text-xs shadow-lg flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* 1. TOP HEADER & KPI SUMMARY */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-xl shrink-0">
                🍽️
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Menu & Category Management Studio</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Sync
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add, edit, remove customer menu categories, dish pricing, and 1-click 86 kitchen out-of-stock items.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleOpenAddCategory}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>+ Add New Category</span>
            </button>
            <button
              onClick={handleOpenAddItem}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Dish</span>
            </button>
          </div>
        </div>

        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {/* Categories */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>Categories</span>
              <FolderTree className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalCategoriesCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Synced across QR & Waiter</div>
          </div>

          {/* Dishes */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>Total Dishes</span>
              <UtensilsCrossed className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalItemsCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">In Food Catalog</div>
          </div>

          {/* In Stock */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold mb-1">
              <span>Available in Kitchen</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">{inStockItemsCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Ready for instant ordering</div>
          </div>

          {/* 86 Out of Stock */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between text-xs text-red-700 font-semibold mb-1">
              <span>86 Out of Stock</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{outOfStock86Count}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Blocked from ordering</div>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === 'CATEGORIES'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>🏷️ Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ITEMS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === 'ITEMS'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>🍽️ All Dishes ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('STOCK_86')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === 'STOCK_86'
              ? 'bg-red-600 text-white shadow-xs font-bold'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>⚡ 86 Kitchen Stock ({outOfStock86Count})</span>
        </button>

        <button
          onClick={() => setActiveTab('RECIPES')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeTab === 'RECIPES'
              ? 'bg-blue-600 text-white shadow-xs font-bold'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-xs'
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
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Active Menu Categories</span>
                <span className="text-xs text-slate-500 font-normal">
                  (Changes reflect in Customer QR menu & Waiter floor app)
                </span>
              </h2>
            </div>
            <button
              onClick={handleOpenAddCategory}
              className="px-3.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-semibold text-xs hover:bg-blue-100 transition flex items-center gap-1 shadow-xs"
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
                  className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs transition-all hover:shadow-md relative group"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-lg font-bold shrink-0">
                        📁
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition">
                          {cat.name}
                        </h3>
                        <span className="text-[11px] text-slate-500">Order: #{cat.displayOrder || idx + 1}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="Edit Category Name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Total Dishes:</span>
                      <span className="font-semibold text-slate-800 px-2 py-0.5 rounded-md bg-slate-100">
                        {count} items
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500">
                      <span>Kitchen Pass:</span>
                      <span className="font-semibold text-slate-700">
                        {cat.kitchenStationName || 'Hot Pass Station'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500">
                      <span>Status:</span>
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
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
                    className="w-full mt-4 py-2 rounded-lg text-center text-xs font-semibold bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 transition"
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
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dishes (e.g. Paneer, Biryani, Tikka)..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Veg / Non-Veg Toggle & Add Dish */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold">
                  <button
                    onClick={() => setFoodTypeFilter('ALL')}
                    className={`px-3 py-1 rounded-lg transition ${
                      foodTypeFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFoodTypeFilter('VEG')}
                    className={`px-3 py-1 rounded-lg transition ${
                      foodTypeFilter === 'VEG'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    Pure Veg
                  </button>
                  <button
                    onClick={() => setFoodTypeFilter('NON_VEG')}
                    className={`px-3 py-1 rounded-lg transition ${
                      foodTypeFilter === 'NON_VEG'
                        ? 'bg-red-600 text-white font-bold'
                        : 'text-slate-600 hover:text-red-700'
                    }`}
                  >
                    Non-Veg
                  </button>
                </div>

                <button
                  onClick={handleOpenAddItem}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs"
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCatFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
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
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                      selectedCatFilter === c.name
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
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
                  className={`p-4 rounded-xl border border-slate-200 bg-white shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${
                    !isAvailable ? 'opacity-85 border-red-300' : ''
                  }`}
                >
                  <div>
                    {/* Image & Food Type Pill */}
                    <div className="relative h-36 rounded-xl overflow-hidden mb-3 bg-slate-100 border border-slate-200">
                      <img
                        src={dish.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'}
                        alt={dish.name}
                        className={`w-full h-full object-cover transition-transform duration-300 hover:scale-105 ${
                          !isAvailable ? 'grayscale' : ''
                        }`}
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-white/95 shadow-xs border ${
                          dish.foodType === 'NON_VEG'
                            ? 'text-red-700 border-red-200'
                            : 'text-emerald-700 border-emerald-200'
                        }`}>
                          {dish.foodType === 'NON_VEG' ? '🔴 Non-Veg' : '🟢 Pure Veg'}
                        </span>
                      </div>

                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase ${
                          isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                            : 'bg-red-50 text-red-700 border border-red-200 font-bold'
                        }`}>
                          {isAvailable ? 'In Stock' : '86 Out of Stock'}
                        </span>
                      </div>

                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] font-semibold text-slate-700 border border-slate-200">
                        {dish.category}
                      </div>
                    </div>

                    {/* Title & Price */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{dish.name}</h3>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {dish.description || 'Delicious freshly prepared recipe with authentic herbs and spices.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Controls */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-bold text-slate-900">
                        ₹{dish.price}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dish.prepTimeMinutes || 15} mins</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 1-Click 86 Toggle */}
                      <button
                        onClick={() => handleToggle86(dish)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 ${
                          isAvailable
                            ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title="Toggle Out of Stock status"
                      >
                        {isAvailable ? '⚡ Mark 86 Out of Stock' : '✓ Restock (Make Available)'}
                      </button>

                      <button
                        onClick={() => handleOpenEditItem(dish)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                        title="Edit Dish Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteItem(dish)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
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
      {/* 5. TAB 3: LIVE MENU STOCK & 86 AVAILABILITY MASTER                        */}
      {/* ========================================================================= */}
      {activeTab === 'STOCK_86' && (() => {
        const inStockCount = items.filter((it) => it.isAvailable !== false).length;
        const outOfStockCount = items.filter((it) => it.isAvailable === false).length;
        const filteredStockItems = items.filter((dish) => {
          const isAvailable = dish.isAvailable !== false;
          if (stockFilter === 'IN_STOCK' && !isAvailable) return false;
          if (stockFilter === 'OUT_OF_STOCK' && isAvailable) return false;
          if (stockCatFilter !== 'ALL' && dish.category.toLowerCase() !== stockCatFilter.toLowerCase()) return false;
          if (stockSearchQuery.trim()) {
            const q = stockSearchQuery.toLowerCase();
            return dish.name.toLowerCase().includes(q) || dish.category.toLowerCase().includes(q);
          }
          return true;
        });

        return (
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-6">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                    <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">📦</span>
                    <span>Live Menu Stock & Dish Availability Controller</span>
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Dynamic Sync Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Manage live kitchen stock for all dishes. Any dish marked &quot;86 Out of Stock&quot; is immediately blocked from Customer QR (:3001) and In-Room Guest Portal (:3004).
                </p>
              </div>

              {/* Instant Refresh Button */}
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition flex items-center gap-2 shrink-0 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
                <span>Refresh Menu Stock</span>
              </button>
            </div>

            {/* KPI Counter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                  <span>Total Catalog Items</span>
                  <UtensilsCrossed className="w-4 h-4 text-slate-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{items.length}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Dishes configured in system</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold mb-1">
                  <span>In Stock & Ready</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-700">{inStockCount}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Orderable by guests right now</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between text-xs text-red-700 font-semibold mb-1">
                  <span>86 Out of Stock</span>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Blocked across all guest portals</div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1">
                <button
                  onClick={() => setStockFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    stockFilter === 'ALL'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200'
                  }`}
                >
                  All Dishes ({items.length})
                </button>
                <button
                  onClick={() => setStockFilter('IN_STOCK')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    stockFilter === 'IN_STOCK'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200'
                  }`}
                >
                  🟢 In Stock ({inStockCount})
                </button>
                <button
                  onClick={() => setStockFilter('OUT_OF_STOCK')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    stockFilter === 'OUT_OF_STOCK'
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200'
                  }`}
                >
                  🔴 86 Out of Stock ({outOfStockCount})
                </button>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                {/* Search */}
                <div className="relative flex-1 md:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
                    placeholder="Search dish or category..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                  {stockSearchQuery && (
                    <button
                      onClick={() => setStockSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Dropdown */}
                <select
                  value={stockCatFilter}
                  onChange={(e) => setStockCatFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dishes Inventory List */}
            {filteredStockItems.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
                <UtensilsCrossed className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-sm font-semibold text-slate-900">No dishes match the selected filter</div>
                <div className="text-xs text-slate-500">Try changing your search term or stock filter above.</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden bg-white">
                {filteredStockItems.map((dish) => {
                  const isAvailable = dish.isAvailable !== false;
                  return (
                    <div
                      key={dish.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-slate-50 ${
                        !isAvailable ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Left: Image & Info */}
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                          <img
                            src={dish.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'}
                            alt={dish.name}
                            className={`w-full h-full object-cover ${!isAvailable ? 'grayscale opacity-60' : ''}`}
                          />
                          <span
                            className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                              dish.foodType === 'NON_VEG' ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                            title={dish.foodType === 'NON_VEG' ? 'Non-Veg' : 'Veg'}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{dish.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {dish.category}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                            <span className="font-bold text-slate-900">₹{dish.price}</span>
                            <span>•</span>
                            <span>Prep: {dish.prepTimeMinutes || 15}m</span>
                            <span>•</span>
                            <span className="text-slate-500">{dish.description ? `${dish.description.slice(0, 50)}...` : 'Regular Menu Item'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Live Status Badge & 1-Tap Toggle */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        {/* Live Stock Badge */}
                        <div className="text-right">
                          {isAvailable ? (
                            <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>In Stock (Live on QR)</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5 shadow-xs">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              <span>86 Out of Stock</span>
                            </span>
                          )}
                        </div>

                        {/* 1-Tap Toggle Action Button */}
                        <button
                          onClick={() => handleToggle86(dish)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs ${
                            isAvailable
                              ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                              : 'bg-emerald-600 text-white font-bold hover:bg-emerald-700'
                          }`}
                          title={isAvailable ? 'Block this dish on customer QR menus' : 'Make this dish orderable on customer QR menus'}
                        >
                          {isAvailable ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>⚡ Mark 86</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>✓ Restock Dish</span>
                            </>
                          )}
                        </button>

                        {/* Quick Edit */}
                        <button
                          onClick={() => handleOpenEditItem(dish)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                          title="Edit Dish Pricing / Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 5B. TAB 4: RECIPES & BOM COSTING                                          */}
      {/* ========================================================================= */}
      {activeTab === 'RECIPES' && (
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black flex items-center gap-2 text-slate-900">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span>Recipe Costing & Bill of Materials (BOM)</span>
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  Auto COGS Calculation
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Link finished menu items to raw ingredients, track food cost % vs selling price and prevent margin erosion.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                <span className="text-slate-500 text-[10px] block font-bold">AVG FOOD COST</span>
                <span className="text-emerald-700 font-bold">21.8% (Target: &lt; 30%)</span>
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
                  className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs transition-all hover:border-slate-300"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {rc.category}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2">{rc.dishName}</h3>
                      <p className="text-[11px] text-slate-500">{rc.portion}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        isHighMargin
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isOptimal
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {rc.status}
                    </span>
                  </div>

                  {/* Pricing & Cost Matrix */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">SALE PRICE</span>
                      <span className="text-sm font-bold text-slate-900">₹{rc.sellingPrice}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">RAW COGS</span>
                      <span className="text-sm font-bold text-slate-700">₹{rc.cogsCost}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">FOOD COST</span>
                      <span
                        className={`text-sm font-bold ${
                          isHighMargin ? 'text-emerald-700' : isOptimal ? 'text-blue-700' : 'text-amber-700'
                        }`}
                      >
                        {rc.foodCostPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Ingredients Bill of Materials List */}
                  <div className="mt-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Recipe Ingredients (BOM):
                    </span>
                    <div className="space-y-1 text-xs">
                      {rc.ingredients.map((ing, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1 border-b border-slate-100 text-[11px]"
                        >
                          <span className="text-slate-700">
                            {ing.name} <span className="text-slate-500">({ing.qty})</span>
                          </span>
                          <span className="font-mono text-slate-600 font-medium">₹{ing.cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Chef: <strong className="text-slate-700">{rc.chefInCharge}</strong></span>
                    <span className="font-bold text-emerald-700">
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingCategory ? 'Edit Menu Category' : 'Create New Menu Category'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Manage categories visible to customers</p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Italian Pizza & Pasta"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={categoryDisplayOrder}
                    onChange={(e) => setCategoryDisplayOrder(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Kitchen Station</label>
                  <select
                    value={categoryStation}
                    onChange={(e) => setCategoryStation(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Executive Chef Hot Pass">Hot Pass Pass</option>
                    <option value="Tandoor & Starters">Tandoor Station</option>
                    <option value="Main Curry & Gravy">Main Curry Station</option>
                    <option value="Beverage & Bar Counter">Beverage Counter</option>
                    <option value="Bakery & Desserts">Bakery & Desserts</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="max-w-lg w-full rounded-2xl border border-slate-200 bg-white text-slate-900 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingItem ? 'Edit Food Item / Dish' : 'Add New Food Item'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Configure item name, category and pricing</p>
                </div>
              </div>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Dish Photo Upload & Camera Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Dish Photo (Gallery or Camera)</span>
                  </label>
                  {dishImage && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Photo Attached
                    </span>
                  )}
                </div>

                {/* Hidden File Inputs for Gallery and Camera */}
                <input
                  type="file"
                  ref={galleryInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageFileChange}
                />

                {dishImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                    <img
                      src={dishImage}
                      alt="Dish preview"
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 text-[11px] font-bold flex items-center gap-1 shadow-xs transition"
                        >
                          <Upload className="w-3 h-3 text-slate-700" />
                          <span>Change</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Camera</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDishImage('')}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition-all">
                    {isCompressingImage ? (
                      <div className="flex flex-col items-center justify-center py-4 space-y-2 text-slate-700">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="text-xs font-bold">Optimizing Photo...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mb-1.5">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-900">Upload Dish Photo</p>
                          <p className="text-[11px] text-slate-500">
                            Select an appetizing food picture from your device or camera
                          </p>
                        </div>

                        {/* Dual Action Buttons: Gallery & Camera */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            className="p-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                          >
                            <Upload className="w-3.5 h-3.5 text-slate-600" />
                            <span>Choose from Gallery</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="p-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                          >
                            <Camera className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Take Photo</span>
                          </button>
                        </div>

                        {/* Quick 1-Click Culinary Photo Presets */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Or Quick Select Presets:
                          </p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { label: 'Curry / Paneer', url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80' },
                              { label: 'Biryani / Rice', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80' },
                              { label: 'Tandoor / Tikka', url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80' },
                              { label: 'Dosa / South', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80' },
                              { label: 'Rolls / Chinese', url: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&auto=format&fit=crop&q=80' },
                              { label: 'Breads / Naan', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80' },
                              { label: 'Beverage / Drink', url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80' },
                              { label: 'Dessert / Sweet', url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&auto=format&fit=crop&q=80' },
                            ].map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setDishImage(preset.url)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition text-center truncate ${
                                  dishImage === preset.url
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Dish Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kadai Paneer Masala"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={dishCategoryId}
                    onChange={(e) => setDishCategoryId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="280"
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Dietary Type</label>
                  <select
                    value={dishFoodType}
                    onChange={(e) => setDishFoodType(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="VEG">🟢 Pure Veg</option>
                    <option value="NON_VEG">🔴 Non-Veg</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Prep Time (Mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={dishPrepTime}
                    onChange={(e) => setDishPrepTime(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description / Ingredients</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Fresh cottage cheese simmered in spiced tomato gravy."
                  value={dishDescription}
                  onChange={(e) => setDishDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
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
