import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flame,
  X,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Filter,
  Check
} from 'lucide-react';
import { TableStatusItem } from '../WaiterMobileApp';

export interface MenuStockItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isVeg: boolean;
  description: string;
  isAvailable: boolean;
  portionsRemaining: number;
  prepTimeMinutes: number;
  image?: string;
  outOfStockReason?: string;
  isLowStock?: boolean;
}

const DEFAULT_MENU_ITEMS: MenuStockItem[] = [
  {
    id: 'm-1',
    name: 'Paneer Butter Masala',
    category: 'Main Course',
    price: 320,
    isVeg: true,
    description: 'Fresh cottage cheese cubes in rich spiced butter and tomato cashew gravy',
    isAvailable: true,
    portionsRemaining: 18,
    prepTimeMinutes: 15,
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'm-2',
    name: 'Butter Naan',
    category: 'Breads & Rice',
    price: 60,
    isVeg: true,
    description: 'Traditional clay oven tandoori flatbread brushed with salted butter',
    isAvailable: true,
    portionsRemaining: 45,
    prepTimeMinutes: 6,
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'm-3',
    name: 'Dal Makhani Bukhara',
    category: 'Main Course',
    price: 280,
    isVeg: true,
    description: 'Slow-cooked black lentils simmered for 16 hours with cream and fresh spices',
    isAvailable: true,
    portionsRemaining: 3, // Low stock!
    prepTimeMinutes: 12,
    isLowStock: true,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'm-4',
    name: 'Murgh Tikka Angara',
    category: 'Starters',
    price: 380,
    isVeg: false,
    description: 'Smoky roasted boneless chicken marinated in Degi mirch and hung curd',
    isAvailable: true,
    portionsRemaining: 14,
    prepTimeMinutes: 18,
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'm-5',
    name: 'Awadhi Murgh Dum Biryani',
    category: 'Main Course',
    price: 440,
    isVeg: false,
    description: 'Fragrant Daawat basmati rice layered with juicy chicken, saffron milk and mint',
    isAvailable: false, // 86'd!
    portionsRemaining: 0,
    prepTimeMinutes: 20,
    outOfStockReason: 'Chicken stock depleted in dinner rush',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'm-6',
    name: 'Veg Dum Biryani Handi',
    category: 'Main Course',
    price: 290,
    isVeg: true,
    description: 'Clay pot cooked aromatic basmati rice with seasonal veggies and caramelized onions',
    isAvailable: true,
    portionsRemaining: 12,
    prepTimeMinutes: 16,
    image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'm-7',
    name: 'Garlic Butter Naan',
    category: 'Breads & Rice',
    price: 80,
    isVeg: true,
    description: 'Crisp layered naan generously topped with roasted crushed garlic and coriander',
    isAvailable: true,
    portionsRemaining: 30,
    prepTimeMinutes: 7,
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'm-8',
    name: 'Tandoori Roti',
    category: 'Breads & Rice',
    price: 45,
    isVeg: true,
    description: 'Whole wheat tandoori flatbread baked crisp in charcoal oven',
    isAvailable: true,
    portionsRemaining: 50,
    prepTimeMinutes: 5,
    image: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'm-9',
    name: 'Cold Coffee with Ice Cream',
    category: 'Beverages',
    price: 160,
    isVeg: true,
    description: 'Blended roasted espresso with chilled milk and rich vanilla scoop',
    isAvailable: true,
    portionsRemaining: 20,
    prepTimeMinutes: 5,
    image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'm-10',
    name: 'Gulab Jamun Flambé (2 Pcs)',
    category: 'Desserts',
    price: 130,
    isVeg: true,
    description: 'Warm khoya dumplings steeped in rose cardamom syrup',
    isAvailable: true,
    portionsRemaining: 16,
    prepTimeMinutes: 5,
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'm-11',
    name: 'Kadhai Paneer',
    category: 'Main Course',
    price: 330,
    isVeg: true,
    description: 'Cottage cheese with crunchy capsicum and onions in fresh ground coriander gravy',
    isAvailable: true,
    portionsRemaining: 2, // Low stock!
    prepTimeMinutes: 14,
    isLowStock: true,
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'm-12',
    name: 'Fresh Lime Soda (Sweet & Salted)',
    category: 'Beverages',
    price: 90,
    isVeg: true,
    description: 'Sparkling citrus soda made with freshly squeezed Nagpur limes and rock salt',
    isAvailable: true,
    portionsRemaining: 35,
    prepTimeMinutes: 4,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300&auto=format&fit=crop&q=80',
  },
];

interface MenuItemsViewProps {
  isDark: boolean;
  menuItems?: any[];
  tablesList?: TableStatusItem[];
  selectedTable?: string;
  onSelectTable?: (table: string) => void;
  onPunchKot: (tableName: string, item?: any) => void;
  onToggleItem86?: (itemId: string, isAvailable: boolean, reason?: string) => Promise<void> | void;
  triggerToast: (msg: string) => void;
}

export const MenuItemsView: React.FC<MenuItemsViewProps> = ({
  isDark,
  menuItems = [],
  tablesList = [],
  selectedTable = 'Table 4',
  onSelectTable,
  onPunchKot,
  onToggleItem86,
  triggerToast,
}) => {
  // Merge incoming menuItems with default rich list
  const [items, setItems] = useState<MenuStockItem[]>(() => {
    if (menuItems && menuItems.length > 0) {
      return menuItems.map((mi: any, idx: number) => {
        const id = mi.id || mi._id || mi.menuItemId || `m-${idx}`;
        const defaultMatch = DEFAULT_MENU_ITEMS.find((d) => d.name.toLowerCase() === (mi.name || '').toLowerCase());
        return {
          id,
          name: mi.name || 'Special Dish',
          category: mi.category || mi.categoryName || defaultMatch?.category || 'Main Course',
          price: mi.price || mi.basePrice || defaultMatch?.price || 250,
          isVeg: mi.foodType === 'VEG' || mi.isVeg === true || defaultMatch?.isVeg || true,
          description: mi.description || defaultMatch?.description || 'Authentic chef prepared specialty',
          isAvailable: mi.isAvailable !== undefined ? mi.isAvailable : defaultMatch?.isAvailable ?? true,
          portionsRemaining: mi.portionsRemaining ?? defaultMatch?.portionsRemaining ?? 15,
          prepTimeMinutes: mi.prepTimeMinutes || mi.preparationTimeMinutes || defaultMatch?.prepTimeMinutes || 15,
          image: (Array.isArray(mi.images) && mi.images[0]) || mi.image || defaultMatch?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80',
          outOfStockReason: mi.outOfStockReason || defaultMatch?.outOfStockReason,
          isLowStock: defaultMatch?.isLowStock || false,
        };
      });
    }
    return DEFAULT_MENU_ITEMS;
  });

  // Keep synced if prop updates
  useEffect(() => {
    if (menuItems && menuItems.length > 0) {
      setItems((prev) =>
        menuItems.map((mi: any, idx: number) => {
          const id = mi.id || mi._id || mi.menuItemId || `m-${idx}`;
          const existing = prev.find((p) => p.id === id || p.name === mi.name);
          const defaultMatch = DEFAULT_MENU_ITEMS.find((d) => d.name.toLowerCase() === (mi.name || '').toLowerCase());
          return {
            id,
            name: mi.name || existing?.name || 'Dish',
            category: mi.category || mi.categoryName || existing?.category || defaultMatch?.category || 'Main Course',
            price: mi.price || mi.basePrice || existing?.price || defaultMatch?.price || 250,
            isVeg: mi.foodType === 'VEG' || mi.isVeg === true || existing?.isVeg || true,
            description: mi.description || existing?.description || 'Authentic specialty',
            isAvailable: mi.isAvailable !== undefined ? mi.isAvailable : existing?.isAvailable ?? true,
            portionsRemaining: existing?.portionsRemaining ?? mi.portionsRemaining ?? defaultMatch?.portionsRemaining ?? 15,
            prepTimeMinutes: mi.prepTimeMinutes || existing?.prepTimeMinutes || 15,
            image: (Array.isArray(mi.images) && mi.images[0]) || mi.image || existing?.image || defaultMatch?.image,
            outOfStockReason: mi.outOfStockReason || existing?.outOfStockReason,
            isLowStock: existing?.isLowStock || false,
          };
        })
      );
    }
  }, [menuItems]);

  const [activeDiet, setActiveDiet] = useState<'All' | 'Veg' | 'Non-Veg'>('All');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeStockFilter, setActiveStockFilter] = useState<'All' | 'In Stock' | 'Low Stock' | '86 Out'>('All');
  const [search, setSearch] = useState('');
  const [currentTargetTable, setCurrentTargetTable] = useState<string>(selectedTable || 'Table 4');

  // Reason modal state for 86ing an item
  const [pending86Item, setPending86Item] = useState<MenuStockItem | null>(null);
  const [selectedReason, setSelectedReason] = useState('Ingredient Stock Exhausted');

  const reasonsList = [
    'Ingredient Stock Exhausted',
    'Kitchen Station High Backlog',
    'Daily Portion Quota Finished',
    'Chef Quality Check / Temperature Hold',
    'Gas / Tandoor Temperature Drop',
  ];

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return ['All', ...Array.from(set)];
  }, [items]);

  // Derived counts
  const totalCount = items.length;
  const inStockCount = items.filter((i) => i.isAvailable && !i.isLowStock).length;
  const lowStockCount = items.filter((i) => i.isAvailable && i.isLowStock).length;
  const outOfStockCount = items.filter((i) => !i.isAvailable).length;

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Diet
      if (activeDiet === 'Veg' && !item.isVeg) return false;
      if (activeDiet === 'Non-Veg' && item.isVeg) return false;

      // Category
      if (activeCategory !== 'All' && item.category !== activeCategory) return false;

      // Stock status
      if (activeStockFilter === 'In Stock' && !item.isAvailable) return false;
      if (activeStockFilter === 'Low Stock' && (!item.isAvailable || !item.isLowStock)) return false;
      if (activeStockFilter === '86 Out' && item.isAvailable) return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        if (!matchesName && !matchesCat && !matchesDesc) return false;
      }

      return true;
    });
  }, [items, activeDiet, activeCategory, activeStockFilter, search]);

  const handleToggleStock = (item: MenuStockItem) => {
    if (item.isAvailable) {
      // Open modal to select reason and confirm 86ing
      setPending86Item(item);
    } else {
      // Direct 1-click restock
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, isAvailable: true, outOfStockReason: undefined } : it
        )
      );
      if (onToggleItem86) onToggleItem86(item.id, true);
      triggerToast(`✓ "${item.name}" is now marked IN STOCK! Customer QR & POS menus refreshed.`);
    }
  };

  const confirmMark86 = () => {
    if (!pending86Item) return;
    const item = pending86Item;
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? { ...it, isAvailable: false, outOfStockReason: selectedReason, portionsRemaining: 0 }
          : it
      )
    );
    if (onToggleItem86) onToggleItem86(item.id, false, selectedReason);
    triggerToast(`🚨 "${item.name}" 86'd (OUT OF STOCK)! Synced with Kitchen KDS & Guest QR.`);
    setPending86Item(null);
  };

  const handleTableChange = (tblName: string) => {
    setCurrentTargetTable(tblName);
    if (onSelectTable) onSelectTable(tblName);
    triggerToast(`🎯 Active Order Table set to ${tblName}`);
  };

  // Sample fallback tables for pill selector if tablesList is empty
  const activeTables = tablesList.length > 0 ? tablesList : [
    { id: 1, name: '1', status: 'Available' as const },
    { id: 2, name: '2', status: 'Occupied' as const, guests: 4 },
    { id: 3, name: '3', status: 'Occupied' as const, guests: 2 },
    { id: 4, name: '4', status: 'My Table' as const, guests: 4 },
    { id: 5, name: '5', status: 'My Table' as const, guests: 3 },
    { id: 6, name: '6', status: 'Available' as const },
  ];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-3 sm:p-5 gap-3.5 sm:gap-4">
      {/* 1. Header Banner & Live Stock Control */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-black text-base sm:text-lg tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Menu & Stock (86 Control)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse">
                Live Kitchen Sync
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Check portions, punch direct table KOTs, and toggle 86 item availability in real-time.
            </p>
          </div>
        </div>

        {/* Dietary Filters */}
        <div className="flex items-center gap-1.5 self-start md:self-auto">
          {(['All', 'Veg', 'Non-Veg'] as const).map((diet) => (
            <button
              key={diet}
              onClick={() => setActiveDiet(diet)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeDiet === diet
                  ? diet === 'Veg'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : diet === 'Non-Veg'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-orange-500 text-white shadow-sm'
                  : isDark
                  ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {diet === 'Veg' && <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />}
              {diet === 'Non-Veg' && <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />}
              <span>{diet === 'Veg' ? 'Veg Only' : diet === 'Non-Veg' ? 'Non-Veg' : 'All Diet'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Stock KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => setActiveStockFilter('All')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeStockFilter === 'All'
              ? 'ring-2 ring-orange-500 shadow-md'
              : ''
          } ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Dishes</span>
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className={`text-xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {totalCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">On Active Menu</div>
        </button>

        <button
          onClick={() => setActiveStockFilter('In Stock')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeStockFilter === 'In Stock'
              ? 'ring-2 ring-emerald-500 shadow-md'
              : ''
          } ${
            isDark ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50/70 border-emerald-200 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center justify-between">
            <span>In Stock</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {inStockCount}
          </div>
          <div className="text-[10px] text-emerald-700/80 font-medium mt-0.5">Ready to prepare</div>
        </button>

        <button
          onClick={() => setActiveStockFilter('Low Stock')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeStockFilter === 'Low Stock'
              ? 'ring-2 ring-amber-500 shadow-md'
              : ''
          } ${
            isDark ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50/80 border-amber-200 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center justify-between">
            <span>Low Stock</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 mt-1">
            {lowStockCount}
          </div>
          <div className="text-[10px] text-amber-700/80 font-medium mt-0.5">≤ 3 portions left</div>
        </button>

        <button
          onClick={() => setActiveStockFilter('86 Out')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeStockFilter === '86 Out'
              ? 'ring-2 ring-red-500 shadow-md'
              : ''
          } ${
            isDark ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50/80 border-red-200 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider flex items-center justify-between">
            <span>86'd (Out of Stock)</span>
            <X className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-xl font-black text-red-600 mt-1">
            {outOfStockCount}
          </div>
          <div className="text-[10px] text-red-700/80 font-medium mt-0.5">Disabled on QR/POS</div>
        </button>
      </div>

      {/* 3. Target Table Selector Bar */}
      <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-orange-500 tracking-wider">
            Order Target:
          </span>
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black shadow-xs ${
            isDark ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-orange-100 text-orange-800 border border-orange-200'
          }`}>
            {currentTargetTable}
          </span>
          <span className={`text-[11px] hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            (Punch button will assign items to this table)
          </span>
        </div>

        {/* Scrollable Table Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {activeTables.map((tbl) => {
            const tblName = `Table ${tbl.name}`;
            const isSelected = currentTargetTable === tblName || currentTargetTable === tbl.name;
            return (
              <button
                key={tbl.id}
                onClick={() => handleTableChange(tblName)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-sm'
                    : isDark
                    ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>T-{tbl.name}</span>
                {tbl.status === 'My Table' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Assigned Table" />
                )}
                {tbl.status === 'Occupied' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Occupied" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Search & Categories Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 custom-scrollbar">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeCategory === c
                  ? 'bg-orange-500 text-white shadow-sm'
                  : isDark
                  ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search dish, spice, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 transition ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </div>
      </div>

      {/* 5. Menu Items Grid */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-28 lg:pb-8">
        {filteredItems.length === 0 ? (
          <div className={`text-center py-16 rounded-2xl border ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-2xs'
          }`}>
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40 text-orange-500" />
            <div className="font-black text-sm">No dishes matched current filters</div>
            <p className="text-xs mt-1">Try switching diet, category or stock filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all hover:shadow-lg ${
                  !item.isAvailable
                    ? isDark
                      ? 'bg-red-950/10 border-red-900/30 opacity-80'
                      : 'bg-red-50/50 border-red-200 opacity-85'
                    : item.isLowStock
                    ? isDark
                      ? 'bg-amber-950/10 border-amber-900/40'
                      : 'bg-amber-50/40 border-amber-200'
                    : isDark
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div>
                  {/* Top Row: Veg indicator, Image, Name & Price */}
                  <div className="flex items-start gap-3">
                    {/* Dish Image */}
                    {item.image && (
                      <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden shrink-0 border border-slate-700/20">
                        <img
                          src={item.image}
                          alt={item.name}
                          className={`w-full h-full object-cover transition duration-300 ${
                            !item.isAvailable ? 'grayscale' : ''
                          }`}
                        />
                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center text-[10px] font-black text-white">
                            86'D
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* FSSAI Veg / Non-Veg Indicator */}
                          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            item.isVeg ? 'border-emerald-600' : 'border-red-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                            }`} />
                          </span>

                          <h3 className={`font-black text-sm truncate ${
                            !item.isAvailable
                              ? 'line-through text-slate-400'
                              : isDark
                              ? 'text-white'
                              : 'text-slate-900'
                          }`}>
                            {item.name}
                          </h3>
                        </div>

                        <span className={`font-black text-sm shrink-0 ${
                          isDark ? 'text-emerald-400' : 'text-emerald-700'
                        }`}>
                          ₹{item.price}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          isDark ? 'text-orange-400' : 'text-orange-700'
                        }`}>
                          {item.category}
                        </span>
                        <span className={`text-[10px] flex items-center gap-1 ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          <Clock className="w-2.5 h-2.5" />
                          {item.prepTimeMinutes}m
                        </span>
                      </div>

                      <p className={`text-xs mt-1 line-clamp-2 ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Portions & Reason Alert */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-700/10">
                    <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Available Portions:
                    </span>
                    {item.isAvailable ? (
                      item.isLowStock ? (
                        <span className="px-2 py-0.5 rounded-md font-black bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          {item.portionsRemaining} Left (Low Stock)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md font-black bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                          {item.portionsRemaining} Portions Left
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 rounded-md font-black bg-red-500/20 text-red-500 border border-red-500/30">
                        0 Portions (Out of Stock)
                      </span>
                    )}
                  </div>

                  {/* 86 Reason note if item is out of stock */}
                  {!item.isAvailable && item.outOfStockReason && (
                    <div className="mt-1.5 text-[10px] text-red-500 font-bold bg-red-500/10 p-1.5 rounded-lg border border-red-500/20">
                      Reason: {item.outOfStockReason}
                    </div>
                  )}
                </div>

                {/* Bottom Actions: 86 Toggle & Punch in KOT */}
                <div className="space-y-2 pt-2 border-t border-slate-700/15">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Stock Status:
                    </span>
                    <button
                      onClick={() => handleToggleStock(item)}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-2xs ${
                        item.isAvailable
                          ? isDark
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                          : 'bg-red-600 hover:bg-red-500 text-white shadow-sm'
                      }`}
                    >
                      {item.isAvailable ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>In Stock</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5" />
                          <span>86'd (Click to Restock)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Direct Table Punch Button */}
                  <button
                    disabled={!item.isAvailable}
                    onClick={() => onPunchKot(currentTargetTable, item)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                      item.isAvailable
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-98'
                        : isDark
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/30'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {item.isAvailable
                        ? `Punch for ${currentTargetTable}`
                        : 'Item Unavailable (86\'d)'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Reason Confirmation Modal for 86ing an Item */}
      {pending86Item && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className={`max-w-md w-full rounded-2xl border p-5 space-y-4 shadow-sm dark:shadow-none ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">Mark Item 86 (Out of Stock)</h3>
                  <p className="text-xs text-slate-400">"{pending86Item.name}"</p>
                </div>
              </div>
              <button
                onClick={() => setPending86Item(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800/20 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 leading-relaxed font-semibold">
              ⚠️ Warning: Marking this dish 86 will immediately block orders across <strong>Customer Table QR</strong>, <strong>Kitchen KDS</strong>, and <strong>Cashier POS</strong>!
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Select Out of Stock Reason:</label>
              <div className="space-y-1">
                {reasonsList.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                      selectedReason === reason
                        ? 'bg-red-600 text-white shadow-sm'
                        : isDark
                        ? 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <span>{reason}</span>
                    {selectedReason === reason && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/20">
              <button
                type="button"
                onClick={() => setPending86Item(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmMark86}
                className="px-4 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-500 text-white shadow-md transition"
              >
                Confirm 86 (Out of Stock)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
