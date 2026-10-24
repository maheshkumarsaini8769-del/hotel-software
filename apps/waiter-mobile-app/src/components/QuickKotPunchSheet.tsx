import React, { useState, useMemo } from 'react';
import {
  Flame,
  UtensilsCrossed,
  Sparkles,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Users,
  ShieldCheck,
  AlertCircle,
  X,
  ChefHat,
  Clock,
  ArrowRight,
  Filter
} from 'lucide-react';
import { TableStatusItem } from '../WaiterMobileApp';
import { WaiterStaffProfile } from './WaiterLoginScreen';

export interface QuickKotPunchItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  specialInstructions?: string;
  isVeg?: boolean;
}

export interface QuickKotPunchSheetProps {
  selectedTable?: string;
  onSelectTable?: (table: string) => void;
  allTables?: TableStatusItem[];
  currentStaff?: WaiterStaffProfile;
  menuItems?: any[];
  courtesyNote?: string;
  isDark?: boolean;
  draftKot?: any;
  onAddItem?: (item: any) => void;
  onUpdateQuantity?: (menuItemId: string, delta: number) => void;
  onFireKot: (
    targetTable: string,
    items: QuickKotPunchItem[],
    instructions?: string
  ) => Promise<void> | void;
  onCancel: () => void;
  onOpenOtherTablesPage?: () => void;
}

const DEFAULT_MENU_ITEMS: Array<{
  id: string;
  name: string;
  category: string;
  price: number;
  isVeg: boolean;
  description: string;
}> = [
  { id: 'm-1', name: 'Paneer Butter Masala', category: 'Main Course', price: 320, isVeg: true, description: 'Cottage cheese cubes in rich spiced butter gravy' },
  { id: 'm-2', name: 'Butter Naan', category: 'Breads & Rice', price: 60, isVeg: true, description: 'Traditional clay oven tandoori bread with butter' },
  { id: 'm-3', name: 'Dal Makhani', category: 'Main Course', price: 280, isVeg: true, description: 'Slow cooked black lentils with cream and spices' },
  { id: 'm-4', name: 'Chicken Tikka', category: 'Starters', price: 380, isVeg: false, description: 'Smoky roasted chicken skewers marinated in tandoori spices' },
  { id: 'm-5', name: 'Mutton Rogan Josh', category: 'Main Course', price: 480, isVeg: false, description: 'Kashmiri style aromatic slow braised mutton curry' },
  { id: 'm-6', name: 'Veg Dum Biryani', category: 'Main Course', price: 290, isVeg: true, description: 'Fragrant basmati rice cooked with fresh seasonal veggies & saffron' },
  { id: 'm-7', name: 'Cold Coffee with Ice Cream', category: 'Beverages', price: 160, isVeg: true, description: 'Blended espresso with chilled milk and vanilla scoop' },
  { id: 'm-8', name: 'Gulab Jamun (2 Pcs)', category: 'Desserts', price: 120, isVeg: true, description: 'Warm milk dumplings soaked in cardamom sugar syrup' },
  { id: 'm-9', name: 'Masala Papad', category: 'Starters', price: 70, isVeg: true, description: 'Crispy roasted lentil cracker with spiced onion-tomato salsa' },
  { id: 'm-10', name: 'Garlic Butter Naan', category: 'Breads & Rice', price: 80, isVeg: true, description: 'Crisp naan brushed with crushed garlic butter' },
  { id: 'm-11', name: 'Chicken Biryani', category: 'Main Course', price: 390, isVeg: false, description: 'Spiced basmati rice layered with tender juicy chicken' },
  { id: 'm-12', name: 'Fresh Lime Soda', category: 'Beverages', price: 90, isVeg: true, description: 'Refreshing sparkling limeade (sweet & salted)' },
];

const PRESET_INSTRUCTIONS = [
  '🌶️ Less Spicy',
  '🚫 No Garlic / Onion',
  '🔥 Extra Crispy',
  '⚡ Rush Order (In Hurry)',
  '👶 Kid Friendly (Mild)',
  '🍲 Serve Starters First',
];

export const QuickKotPunchSheet: React.FC<QuickKotPunchSheetProps> = ({
  selectedTable = 'Table 5',
  onSelectTable,
  allTables = [],
  currentStaff,
  menuItems = [],
  courtesyNote,
  isDark = false,
  onFireKot,
  onCancel,
  onOpenOtherTablesPage,
}) => {
  const [activeTable, setActiveTable] = useState<string>(selectedTable);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dietFilter, setDietFilter] = useState<'All' | 'Veg' | 'Non-Veg'>('All');
  const [instructions, setInstructions] = useState<string>('');
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');

  // Cart state: item dictionary
  const [cartItems, setCartItems] = useState<QuickKotPunchItem[]>([
    // Starter default: 1 Butter Naan & 1 Dal Makhani to let waiter test quickly or edit
    {
      menuItemId: 'm-2',
      name: 'Butter Naan',
      unitPrice: 60,
      quantity: 2,
      isVeg: true,
    },
    {
      menuItemId: 'm-3',
      name: 'Dal Makhani',
      unitPrice: 280,
      quantity: 1,
      isVeg: true,
    },
  ]);

  // Handle table switch
  const handleTableChange = (newTbl: string) => {
    setActiveTable(newTbl);
    if (onSelectTable) {
      onSelectTable(newTbl);
    }
  };

  // Determine if active table is in waiter's assigned zone
  const tableNum = useMemo(() => {
    const parsed = parseInt(activeTable.replace(/[^0-9]/g, ''), 10);
    return isNaN(parsed) ? 1 : parsed;
  }, [activeTable]);

  const assignedStart = currentStaff?.assignedTableStart || 1;
  const assignedEnd = currentStaff?.assignedTableEnd || 6;
  const isMyAssignedTable = tableNum >= assignedStart && tableNum <= assignedEnd;

  // Determine which waiter handles this table if outside zone
  const externalWaiterName = useMemo(() => {
    if (isMyAssignedTable) return null;
    if (tableNum >= 7 && tableNum <= 11) return 'Ramesh Kumar (Senior Waiter)';
    if (tableNum >= 12 && tableNum <= 16) return 'Sunita Sharma (Captain)';
    return 'Floor Staff';
  }, [tableNum, isMyAssignedTable]);

  // Merge available dishes
  const catalog = useMemo(() => {
    if (menuItems && menuItems.length > 0) {
      return menuItems.map((m: any) => ({
        id: m.id || m.menuItemId || `m-${Math.random()}`,
        name: m.name,
        category: m.category || 'Specialties',
        price: m.basePrice || m.price || 250,
        isVeg: m.foodType ? m.foodType === 'VEG' : (m.isVeg !== undefined ? m.isVeg : true),
        description: m.description || '',
      }));
    }
    return DEFAULT_MENU_ITEMS;
  }, [menuItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((it) => set.add(it.category));
    return ['All', ...Array.from(set)];
  }, [catalog]);

  // Filtered menu
  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchDiet =
        dietFilter === 'All' ||
        (dietFilter === 'Veg' && item.isVeg) ||
        (dietFilter === 'Non-Veg' && !item.isVeg);
      return matchSearch && matchCat && matchDiet;
    });
  }, [catalog, search, selectedCategory, dietFilter]);

  // Cart actions
  const handleAddItem = (dish: { id: string; name: string; price: number; isVeg?: boolean }) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === dish.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === dish.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: dish.id,
          name: dish.name,
          unitPrice: dish.price,
          quantity: 1,
          isVeg: dish.isVeg,
        },
      ];
    });
  };

  const handleUpdateQty = (menuItemId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((i) => {
          if (i.menuItemId === menuItemId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as QuickKotPunchItem[];
    });
  };

  const handleRemoveItem = (menuItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const toggleChip = (chip: string) => {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  }, [cartItems]);
  const cgst = subtotal * 0.025;
  const sgst = subtotal * 0.025;
  const grandTotal = Math.round(subtotal + cgst + sgst);

  // Submit
  const handleFireKot = async () => {
    if (cartItems.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const finalInstructions = [
        ...selectedChips,
        instructions.trim(),
      ]
        .filter(Boolean)
        .join(' • ');

      await onFireKot(activeTable, cartItems, finalInstructions);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Strictly filter to ONLY waiter's own assigned tables (unless opened explicitly from Other Tables page)
  const availableTableOptions = useMemo(() => {
    const sourceList =
      allTables && allTables.length > 0
        ? allTables
        : Array.from({ length: 16 }, (_, idx) => {
            const num = idx + 1;
            return {
              id: num,
              name: String(num),
              guests: 4,
              status: (num === 2 || num === 3 ? 'Occupied' : 'Available') as any,
            };
          });

    // Only include tables in waiter's assigned range ( plus the activeTable if explicitly picked from Other Tables page )
    return sourceList
      .filter((t) => {
        const isMine = t.id >= assignedStart && t.id <= assignedEnd;
        const isExplicitlySelectedExternal = `Table ${t.name}` === activeTable && !isMine;
        return isMine || isExplicitlySelectedExternal;
      })
      .map((t) => ({
        id: t.id,
        name: `Table ${t.name}`,
        guests: t.guests || 4,
        status: t.status,
        isMine: t.id >= assignedStart && t.id <= assignedEnd,
      }));
  }, [allTables, assignedStart, assignedEnd, activeTable]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl h-[92vh] max-h-[860px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-colors ${
          isDark
            ? 'bg-[#0f131f] border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Header Bar */}
        <div
          className={`p-3.5 sm:p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
            isDark
              ? 'bg-[#151928] border-slate-800'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20 text-white shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`font-black text-base sm:text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Take Order & Punch KOT
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-300">
                  My Tables (T-{String(assignedStart).padStart(2, '0')} to T-{String(assignedEnd).padStart(2, '0')})
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Showing only your assigned tables • Use "Other Tables" page for cross-zone orders
              </p>
            </div>
          </div>

          {/* Table Selector & Close */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                My Table:
              </label>
              <select
                value={activeTable}
                onChange={(e) => handleTableChange(e.target.value)}
                className={`py-1.5 px-3 rounded-xl text-xs font-black border outline-none cursor-pointer shadow-2xs transition ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-orange-500'
                }`}
              >
                {availableTableOptions.map((opt) => (
                  <option key={opt.id} value={opt.name}>
                    {opt.name} {opt.isMine ? '(My Assigned Table)' : `(Selected from Other Tables)`}
                  </option>
                ))}
              </select>
            </div>

            {onOpenOtherTablesPage && (
              <button
                type="button"
                onClick={onOpenOtherTablesPage}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center gap-1.5 transition"
                title="Open dedicated page to select another table outside your zone"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Other Tables Page (दूसरी टेबल चुनें)</span>
              </button>
            )}

            <button
              onClick={onCancel}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition border ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table Routing Info Banner */}
        <div
          className={`px-4 py-2 border-b text-xs flex flex-wrap items-center justify-between gap-2 ${
            isMyAssignedTable
              ? isDark
                ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : isDark
              ? 'bg-amber-950/30 border-amber-900/50 text-amber-300'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {isMyAssignedTable ? (
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Users className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span>
              Target: <strong className="font-black">{activeTable}</strong>
              {isMyAssignedTable ? (
                <> • Assigned Duty Station (Tables T-0{assignedStart} to T-0{assignedEnd})</>
              ) : (
                <> • Assigned to <strong>{externalWaiterName}</strong> (Cross-Table Order Assistance)</>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Direct Kitchen KDS Route Active</span>
          </div>
        </div>

        {/* Mobile View Toggle: Dishes Menu vs Order Cart */}
        <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 p-1 shrink-0">
          <button
            onClick={() => setMobileTab('menu')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              mobileTab === 'menu'
                ? 'bg-white dark:bg-slate-900 text-orange-600 shadow-xs'
                : isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            🍲 Dishes Menu ({filteredCatalog.length})
          </button>
          <button
            onClick={() => setMobileTab('cart')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mobileTab === 'cart'
                ? 'bg-white dark:bg-slate-900 text-orange-600 shadow-xs'
                : isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <span>🛒 Cart ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})</span>
            <span className="font-mono text-emerald-600 font-black">• ₹{grandTotal}</span>
          </button>
        </div>

        {/* Main Body: 2 Columns (Menu on Left, Cart & Instructions on Right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Menu Catalog (60%) */}
          <div className={`flex-1 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 ${
            mobileTab === 'menu' ? 'flex' : 'hidden md:flex'
          }`}>
            {/* Search & Categories Bar */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div
                  className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search dishes (Butter Naan, Dal Makhani, Paneer)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent text-xs outline-none font-medium"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dietary Filter Buttons */}
                <div className="flex items-center gap-1 justify-between sm:justify-start">
                  {(['All', 'Veg', 'Non-Veg'] as const).map((diet) => (
                    <button
                      key={diet}
                      onClick={() => setDietFilter(diet)}
                      className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-[11px] font-bold border transition text-center ${
                        dietFilter === diet
                          ? diet === 'Veg'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : diet === 'Non-Veg'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-orange-500 text-white border-orange-500'
                          : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {diet === 'Veg' ? '🟢 Veg' : diet === 'Non-Veg' ? '🔴 Non-Veg' : 'All'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
                      selectedCategory === cat
                        ? 'bg-orange-500 border-orange-500 text-white shadow-2xs'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Dishes Grid */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredCatalog.map((dish) => {
                  const inCart = cartItems.find((i) => i.menuItemId === dish.id);
                  return (
                    <div
                      key={dish.id}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 transition hover:shadow-md ${
                        inCart
                          ? isDark
                            ? 'bg-orange-950/20 border-orange-500/50 shadow-2xs'
                            : 'bg-orange-50/70 border-orange-300 shadow-2xs'
                          : isDark
                          ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                dish.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            <h4
                              className={`font-black text-xs leading-tight ${
                                isDark ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {dish.name}
                            </h4>
                          </div>
                          <p
                            className={`text-[10px] mt-0.5 line-clamp-1 ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {dish.description || dish.category}
                          </p>
                        </div>
                        <span
                          className={`font-black text-xs shrink-0 ${
                            isDark ? 'text-emerald-400' : 'text-emerald-700'
                          }`}
                        >
                          ₹{dish.price}
                        </span>
                      </div>

                      {/* Add or Counter Controls */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span
                          className={`text-[10px] font-bold ${
                            isDark ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          {dish.category}
                        </span>

                        {inCart ? (
                          <div className="flex items-center gap-1.5 bg-orange-500 text-white rounded-lg p-0.5 shadow-2xs">
                            <button
                              onClick={() => handleUpdateQty(dish.id, -1)}
                              className="w-5 h-5 rounded flex items-center justify-center hover:bg-orange-600 transition"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center font-black text-xs">
                              {inCart.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQty(dish.id, 1)}
                              className="w-5 h-5 rounded flex items-center justify-center hover:bg-orange-600 transition"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddItem(dish)}
                            className="py-1 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-black text-[11px] flex items-center gap-1 shadow-2xs transition active:scale-95"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCatalog.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  No matching dishes found for "{search}".
                </div>
              )}
            </div>

            {/* Mobile Review Floating Action Bar */}
            {cartItems.length > 0 && (
              <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 md:hidden bg-white dark:bg-slate-900 shrink-0 shadow-lg">
                <button
                  onClick={() => setMobileTab('cart')}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs flex items-center justify-between shadow-md active:scale-98 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>{cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items Added • ₹{grandTotal}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>Review & Fire</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Active Cart, Cooking Instructions & Punch Button (40%) */}
          <div className={`w-full md:w-[380px] flex flex-col justify-between overflow-hidden bg-slate-50/50 dark:bg-slate-900/30 ${
            mobileTab === 'cart' ? 'flex flex-1' : 'hidden md:flex'
          }`}>
            {/* Cart Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileTab('menu')}
                  className="md:hidden text-xs font-bold text-orange-500 hover:underline flex items-center gap-1 mr-1"
                >
                  ← Menu
                </button>
                <ChefHat className="w-4 h-4 text-orange-500" />
                <h3 className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Order Cart ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})
                </h3>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={() => setCartItems([])}
                  className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
                  <UtensilsCrossed className="w-8 h-8 opacity-40 text-slate-400" />
                  <p className="text-xs font-medium">Cart is empty.</p>
                  <p className="text-[11px]">Select dishes from the menu to start order for {activeTable}.</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.menuItemId}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 shadow-2xs ${
                      isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <h5 className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.name}
                      </h5>
                      <div className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        ₹{item.unitPrice} × {item.quantity} = <strong className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>₹{item.unitPrice * item.quantity}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUpdateQty(item.menuItemId, -1)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs transition ${
                          isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className={`w-5 text-center font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(item.menuItemId, 1)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs transition ${
                          isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.menuItemId)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition ml-1"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chef Cooking Instructions & Presets */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900/60">
              <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Chef Cooking Instructions:</span>
              </label>

              {/* Preset chips */}
              <div className="flex flex-wrap gap-1">
                {PRESET_INSTRUCTIONS.map((chip) => {
                  const isSel = selectedChips.includes(chip);
                  return (
                    <button
                      key={chip}
                      onClick={() => toggleChip(chip)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                        isSel
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                placeholder="Custom notes (e.g. Serve hot, no salt on papad)..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs rounded-xl border outline-none font-medium transition ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                }`}
              />
            </div>

            {/* Order Totals & Fire to KDS Button */}
            <div
              className={`p-3.5 border-t space-y-2.5 ${
                isDark
                  ? 'bg-[#151928] border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Subtotal:</span>
                  <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Taxes (GST 5%):</span>
                  <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>₹{(cgst + sgst).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700 text-sm">
                  <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Total Payable:</span>
                  <span className={`font-black text-base ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>₹{grandTotal}</span>
                </div>
              </div>

              {/* Fire Button */}
              <button
                disabled={cartItems.length === 0 || isSubmitting}
                onClick={handleFireKot}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-900/30 flex items-center justify-center gap-2 transition active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Firing KOT to Kitchen KDS...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4" />
                    <span>Fire Order to Kitchen KDS (₹{grandTotal})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
