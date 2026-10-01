import React, { useState } from 'react';
import { MenuItemDTO } from '@spicehub/shared-types';
import { DraftKot, DraftOrderItem, formatCurrency, FoodTypeBadge } from '@spicehub/ui';

export interface QuickKotPunchSheetProps {
  draftKot: DraftKot | null;
  menuItems: MenuItemDTO[];
  onAddItem: (item: DraftOrderItem) => void;
  onUpdateQuantity: (menuItemId: string, delta: number) => void;
  onFireKot: (instructions?: string) => Promise<void> | void;
  onCancel: () => void;
}

export const QuickKotPunchSheet: React.FC<QuickKotPunchSheetProps> = ({
  draftKot,
  menuItems,
  onAddItem,
  onUpdateQuantity,
  onFireKot,
  onCancel,
}) => {
  const [instructions, setInstructions] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  if (!draftKot) return null;

  const filteredItems = menuItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) && i.isAvailable
  );

  const subtotal = draftKot.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-slate-800 dark:text-white">
              Quick KOT Punch • Table {draftKot.tableNumber || draftKot.tableId.substring(0, 6)}
            </h2>
            <p className="text-xs text-slate-400">Direct Route to Kitchen KDS</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active Items in Draft */}
          {draftKot.items.length > 0 && (
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Current Cart ({draftKot.items.length})
              </h3>
              {draftKot.items.map((item) => (
                <div key={item.menuItemId} className="flex items-center justify-between text-sm py-1">
                  <div className="flex-1 pr-2">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                    <div className="text-xs text-slate-400">{formatCurrency(item.unitPrice)} each</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onUpdateQuantity(item.menuItemId, -1)}
                      className="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.menuItemId, 1)}
                      className="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Search */}
          <div>
            <input
              type="text"
              placeholder="Search dishes to add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredItems.map((dish) => {
              const badge = FoodTypeBadge[dish.foodType];
              return (
                <button
                  key={dish.id}
                  onClick={() =>
                    onAddItem({
                      menuItemId: dish.id,
                      name: dish.name,
                      unitPrice: dish.basePrice,
                      quantity: 1,
                    })
                  }
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition"
                >
                  <div className="flex items-center space-x-2">
                    <span>{badge?.icon || '🍽️'}</span>
                    <div>
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {dish.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatCurrency(dish.basePrice)}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-primary-600 font-bold">+ Add</span>
                </button>
              );
            })}
          </div>

          {/* Cooking Instructions */}
          <div>
            <label className="text-xs text-slate-500 font-medium">Chef Cooking Notes:</label>
            <input
              type="text"
              placeholder="e.g. Medium spicy, no garlic"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Subtotal</div>
            <div className="font-bold text-base text-emerald-600">{formatCurrency(subtotal)}</div>
          </div>
          <button
            disabled={draftKot.items.length === 0}
            onClick={() => onFireKot(instructions)}
            className="py-2.5 px-6 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md transition active:scale-95"
          >
            🔥 Fire to KDS
          </button>
        </div>
      </div>
    </div>
  );
};
