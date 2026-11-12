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
  isVeg?: boolean;
  description: string;
  isAvailable: boolean;
  portionsRemaining?: number;
  prepTimeMinutes?: number;
  image?: string;
  outOfStockReason?: string;
  isLowStock?: boolean;
}

function mapMenuItems(menuItems: any[]): MenuStockItem[] {
  return menuItems.flatMap((item) => {
    const id = item.id || item._id || item.menuItemId;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const price = Number(item.price ?? item.basePrice);
    if (!id || !name || !Number.isFinite(price)) return [];

    const portionsRemaining = Number.isFinite(item.portionsRemaining)
      ? Number(item.portionsRemaining)
      : undefined;
    const foodType = String(item.foodType || '').toUpperCase();

    return [{
      id: String(id),
      name,
      category: item.category || item.categoryName || 'Uncategorized',
      price,
      isVeg: foodType === 'VEG' ? true : foodType === 'NON_VEG' ? false : item.isVeg,
      description: item.description || '',
      isAvailable: item.isAvailable !== false,
      portionsRemaining,
      prepTimeMinutes: Number.isFinite(item.prepTimeMinutes ?? item.preparationTimeMinutes)
        ? Number(item.prepTimeMinutes ?? item.preparationTimeMinutes)
        : undefined,
      image: (Array.isArray(item.images) && item.images[0]) || item.image || undefined,
      outOfStockReason: item.outOfStockReason,
      isLowStock: item.isLowStock === true || (portionsRemaining !== undefined && portionsRemaining > 0 && portionsRemaining <= 3),
    }];
  });
}

interface MenuItemsViewProps {
  isDark?: boolean;
  menuItems?: any[];
  tablesList?: TableStatusItem[];
  selectedTable?: string;
  onSelectTable?: (table: string) => void;
  onPunchKot: (tableName: string, item?: any) => void;
  onToggleItem86?: (itemId: string, isAvailable: boolean, reason?: string) => Promise<void> | void;
  triggerToast: (msg: string) => void;
}

export const MenuItemsView: React.FC<MenuItemsViewProps> = ({
  menuItems = [],
  tablesList = [],
  selectedTable = '',
  onSelectTable,
  onPunchKot,
  onToggleItem86,
  triggerToast,
}) => {
  // Merge incoming menuItems with default rich list
  const [items, setItems] = useState<MenuStockItem[]>(() => mapMenuItems(menuItems));

  // Keep synced if prop updates
  useEffect(() => {
    setItems(mapMenuItems(menuItems));
  }, [menuItems]);

  const [activeDiet, setActiveDiet] = useState<'All' | 'Veg' | 'Non-Veg'>('All');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeStockFilter, setActiveStockFilter] = useState<'All' | 'In Stock' | 'Low Stock' | '86 Out'>('All');
  const [search, setSearch] = useState('');
  const [currentTargetTable, setCurrentTargetTable] = useState<string>(selectedTable);

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
      if (activeDiet === 'Veg' && item.isVeg !== true) return false;
      if (activeDiet === 'Non-Veg' && item.isVeg !== false) return false;

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

  const handleToggleStock = async (item: MenuStockItem) => {
    if (!onToggleItem86) {
      triggerToast('Stock updates are unavailable because the hotel server is not connected.');
      return;
    }
    if (item.isAvailable) {
      // Open modal to select reason and confirm 86ing
      setPending86Item(item);
    } else {
      try {
        await onToggleItem86(item.id, true);
        setItems((prev) => prev.map((it) => (
          it.id === item.id ? { ...it, isAvailable: true, outOfStockReason: undefined } : it
        )));
        triggerToast(`"${item.name}" is now in stock.`);
      } catch (error) {
        triggerToast(error instanceof Error ? error.message : 'Could not update stock. Please retry.');
      }
    }
  };

  const confirmMark86 = async () => {
    if (!pending86Item) return;
    const item = pending86Item;
    if (!onToggleItem86) {
      triggerToast('Stock updates are unavailable because the hotel server is not connected.');
      return;
    }
    try {
      await onToggleItem86(item.id, false, selectedReason);
      setItems((prev) => prev.map((it) => (
        it.id === item.id
          ? { ...it, isAvailable: false, outOfStockReason: selectedReason, portionsRemaining: 0 }
          : it
      )));
      triggerToast(`"${item.name}" marked out of stock.`);
      setPending86Item(null);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Could not update stock. Please retry.');
    }
  };

  const handleTableChange = (tblName: string) => {
    setCurrentTargetTable(tblName);
    if (onSelectTable) onSelectTable(tblName);
    triggerToast(`Active Order Table set to ${tblName}`);
  };

  const activeTables = tablesList;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden p-3 sm:p-5 gap-3.5 sm:gap-4">
      {/* 1. Header Banner & Live Stock Control */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-colors ${
 'bg-white border-slate-200 shadow-2xs'
 }`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#123C2B] text-white flex items-center justify-center font-black shadow-xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-black text-base sm:text-lg tracking-tight ${'text-slate-900'}`}>
                Menu & Stock (86 Control)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse">
                Live Kitchen Sync
              </span>
            </div>
            <p className={`text-xs ${'text-slate-600'}`}>
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
 : 'bg-emerald-600 text-white shadow-sm'
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
 'bg-white border-slate-200 shadow-2xs'
 }`}
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Dishes</span>
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className={`text-xl font-black mt-1 ${'text-slate-900'}`}>
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
 'bg-emerald-50/70 border-emerald-200 shadow-2xs'
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
 'bg-amber-50/80 border-amber-200 shadow-2xs'
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
 'bg-red-50/80 border-red-200 shadow-2xs'
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
 'bg-white border-slate-200 shadow-2xs'
 }`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-orange-500 tracking-wider">
            Order Target:
          </span>
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black shadow-xs ${
 'bg-orange-100 text-orange-800 border border-orange-200'
 }`}>
            {currentTargetTable || 'Select a table'}
          </span>
          <span className={`text-[11px] hidden sm:inline ${'text-slate-500'}`}>
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
 ? 'bg-emerald-600 text-white shadow-sm'
 : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
 }`}
              >
                <span>T-{tbl.name}</span>
                {tbl.status === 'My Table' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Assigned Table" />
                )}
                {tbl.status === 'Occupied' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E6B4C]" title="Occupied" />
                )}
              </button>
            );
          })}
          {activeTables.length === 0 && (
            <span className="px-3 py-1 text-xs text-slate-500">No dining tables are configured.</span>
          )}
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
 ? 'bg-emerald-600 text-white shadow-sm'
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
 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
 }`}
          />
        </div>
      </div>

      {/* 5. Menu Items Grid */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-28 lg:pb-8">
        {filteredItems.length === 0 ? (
          <div className={`text-center py-16 rounded-2xl border ${
 'bg-white border-slate-200 text-slate-500 shadow-2xs'
 }`}>
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40 text-orange-500" />
            <div className="font-black text-sm">
              {items.length === 0 ? 'No menu items are configured' : 'No dishes matched current filters'}
            </div>
            <p className="text-xs mt-1">
              {items.length === 0
                ? 'Add menu items in Hotel Admin to make them available for orders.'
                : 'Try switching diet, category or stock filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all hover:shadow-lg ${
 !item.isAvailable
 ? 'bg-red-50/50 border-red-200 opacity-85'
 : item.isLowStock
 ? 'bg-amber-50/40 border-amber-200'
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
 item.isVeg === true ? 'border-emerald-600' : item.isVeg === false ? 'border-red-600' : 'border-slate-400'
 }`} title={item.isVeg === undefined ? 'Dietary classification not provided' : item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
 item.isVeg === true ? 'bg-emerald-600' : item.isVeg === false ? 'bg-red-600' : 'bg-slate-400'
 }`} />
                          </span>

                          <h3 className={`font-black text-sm truncate ${
 !item.isAvailable
 ? 'line-through text-slate-400'
 : 'text-slate-900'
 }`}>
                            {item.name}
                          </h3>
                        </div>

                        <span className={`font-black text-sm shrink-0 ${
 'text-emerald-700'
 }`}>
                          ₹{item.price}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
 'text-orange-700'
 }`}>
                          {item.category}
                        </span>
                        <span className={`text-[10px] flex items-center gap-1 ${
 'text-slate-500'
 }`}>
                          <Clock className="w-2.5 h-2.5" />
                          {item.prepTimeMinutes === undefined ? 'Prep time not set' : `${item.prepTimeMinutes}m`}
                        </span>
                      </div>

                      <p className={`text-xs mt-1 line-clamp-2 ${
 'text-slate-600'
 }`}>
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Portions & Reason Alert */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-700/10">
                    <span className={`font-bold ${'text-slate-500'}`}>
                      Available Portions:
                    </span>
                    {item.isAvailable && item.portionsRemaining === undefined ? (
                      <span className="px-2 py-0.5 rounded-md font-black bg-slate-100 text-slate-600 border border-slate-200">
                        Stock count not configured
                      </span>
                    ) : item.isAvailable ? (
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
                    <span className={`text-[11px] font-semibold ${'text-slate-600'}`}>
                      Stock Status:
                    </span>
                    <button
                      onClick={() => handleToggleStock(item)}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-2xs ${
 item.isAvailable
 ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
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
                    disabled={!item.isAvailable || !currentTargetTable}
                    onClick={() => onPunchKot(currentTargetTable, item)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
 item.isAvailable && currentTargetTable
 ? 'bg-[#123C2B] hover:bg-[#1B5138] text-white shadow-xs active:scale-98'
 : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
 }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {item.isAvailable && currentTargetTable
                        ? `Punch for ${currentTargetTable}`
                        : !currentTargetTable
                          ? 'Select a table first'
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
 'bg-white border-slate-200 text-slate-900'
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
 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
