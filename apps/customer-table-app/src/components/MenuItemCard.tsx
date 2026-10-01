import React from 'react';
import { MenuItemDTO } from '@spicehub/shared-types';
import { formatCurrency, FoodTypeBadge } from '@spicehub/ui';

export interface MenuItemCardProps {
  item: MenuItemDTO;
  cartQuantity: number;
  onAddToCart: (item: MenuItemDTO) => void;
  onUpdateQuantity: (menuItemId: string, delta: number) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  cartQuantity,
  onAddToCart,
  onUpdateQuantity,
}) => {
  const badge = FoodTypeBadge[item.foodType];
  const isOutOfStock = !item.isAvailable;

  return (
    <div
      className={`relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
        isOutOfStock
          ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md'
      }`}
      data-testid={`menu-item-${item.id}`}
    >
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm">{badge?.icon || '🍽️'}</span>
          {isOutOfStock && (
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-md border border-rose-300 dark:border-rose-800">
              ❌ 86 • Out of Stock
            </span>
          )}
        </div>

        {/* Title & Price */}
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug">
          {item.name}
        </h3>
        <p className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          {formatCurrency(item.basePrice)}
        </p>

        {/* Description */}
        {item.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        {isOutOfStock ? (
          <button
            disabled
            className="w-full py-2 px-3 bg-rose-950/30 border border-rose-800/50 text-rose-400 text-xs font-bold rounded-xl cursor-not-allowed text-center flex items-center justify-center gap-1"
          >
            <span>🚫 Sold Out (86)</span>
            {item.outOfStockReason && (
              <span className="text-[10px] text-rose-400/80 font-medium">({item.outOfStockReason.replace(/_/g, ' ')})</span>
            )}
          </button>
        ) : cartQuantity > 0 ? (
          <div className="w-full flex items-center justify-between bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-xl p-1">
            <button
              onClick={() => onUpdateQuantity(item.id, -1)}
              className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 text-primary-600 font-bold flex items-center justify-center shadow-xs"
            >
              -
            </button>
            <span className="font-bold text-xs text-primary-700 dark:text-primary-300">
              {cartQuantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.id, 1)}
              className="w-7 h-7 rounded-lg bg-primary-600 text-white font-bold flex items-center justify-center shadow-xs"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAddToCart(item)}
            className="w-full py-2 px-3 bg-slate-900 hover:bg-primary-600 dark:bg-white dark:text-slate-900 dark:hover:bg-primary-500 dark:hover:text-white text-white text-xs font-bold rounded-xl transition duration-150 shadow-xs active:scale-95 text-center"
          >
            + Add to Cart
          </button>
        )}
      </div>
    </div>
  );
};
