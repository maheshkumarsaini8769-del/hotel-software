import React from 'react';
import { MenuItemDTO } from '@spicehub/shared-types';
import { formatCurrency } from '@spicehub/ui';

export interface MenuItemCardProps {
  item: MenuItemDTO;
  cartQuantity: number;
  onAddToCart: (item: MenuItemDTO) => void;
  onUpdateQuantity: (menuItemId: string, delta: number) => void;
}

const defaultImages: Record<string, string> = {
  'Paneer Tikka Angara': 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300&auto=format&fit=crop&q=80',
  'Murgh Malai Tikka': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300&auto=format&fit=crop&q=80',
  'Dal Makhani Bukhara': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop&q=80',
  'Butter Chicken Aslam Style': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=300&auto=format&fit=crop&q=80',
  'Butter Garlic Naan': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=300&auto=format&fit=crop&q=80',
  'Mint Lime Virgin Mojito': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300&auto=format&fit=crop&q=80',
};

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  cartQuantity,
  onAddToCart,
  onUpdateQuantity,
}) => {
  const isOutOfStock = !item.isAvailable;
  const isVeg = item.foodType === 'VEG';
  const isBeverage = item.foodType === 'BEVERAGE';
  const imgUrl = (item as any).images?.[0] || defaultImages[item.name] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80';

  return (
    <div
      className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex gap-3.5 justify-between items-start ${
        isOutOfStock
          ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
          : 'bg-slate-900/90 hover:bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
      }`}
      data-testid={`menu-item-${item.id}`}
    >
      {/* Left Details */}
      <div className="flex-1 flex flex-col justify-between min-h-[110px]">
        <div>
          {/* Veg/Non-Veg Badge & Badges */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`w-4 h-4 border flex items-center justify-center rounded-[4px] ${
                isVeg
                  ? 'border-emerald-500'
                  : isBeverage
                  ? 'border-cyan-500'
                  : 'border-rose-500'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isVeg
                    ? 'bg-emerald-500'
                    : isBeverage
                    ? 'bg-cyan-500'
                    : 'bg-rose-500'
                }`}
              />
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isVeg ? 'Pure Veg' : isBeverage ? 'Beverage' : 'Non-Veg'}
            </span>
            {isOutOfStock && (
              <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-950 text-rose-300 rounded border border-rose-800">
                86 • Sold Out
              </span>
            )}
          </div>

          {/* Dish Name */}
          <h3 className="font-extrabold text-sm sm:text-base text-white leading-tight">
            {item.name}
          </h3>

          {/* Price */}
          <div className="flex items-center gap-2 mt-1">
            <span className="font-black text-sm sm:text-base text-emerald-400">
              {formatCurrency(item.basePrice || (item as any).price || 0)}
            </span>
            {(item as any).prepTimeMinutes && (
              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                <span>⏱️</span>
                <span>{(item as any).prepTimeMinutes}m</span>
              </span>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* Right Image & Action Counter */}
      <div className="flex flex-col items-center justify-between w-28 sm:w-32 shrink-0">
        <div className="relative w-full h-20 sm:h-24 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/60 shadow-inner">
          <img
            src={imgUrl}
            alt={item.name}
            className="w-full h-full object-cover transition transform duration-300 hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80';
            }}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-[10px] font-extrabold text-rose-300 uppercase tracking-widest px-2 py-0.5 bg-rose-950/80 rounded border border-rose-700">
                Unavailable
              </span>
            </div>
          )}
        </div>

        {/* Counter or Add Button */}
        <div className="w-full mt-2">
          {isOutOfStock ? (
            <button
              disabled
              className="w-full py-1.5 px-2 bg-slate-800/80 border border-slate-700 text-slate-500 text-xs font-bold rounded-xl cursor-not-allowed text-center"
            >
              Sold Out
            </button>
          ) : cartQuantity > 0 ? (
            <div className="w-full flex items-center justify-between bg-amber-500/10 border border-amber-500/40 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => onUpdateQuantity(item.id, -1)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-extrabold flex items-center justify-center active:scale-95 transition"
              >
                -
              </button>
              <span className="font-extrabold text-sm text-amber-300">
                {cartQuantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(item.id, 1)}
                className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold flex items-center justify-center active:scale-95 transition"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAddToCart(item)}
              className="w-full py-1.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1"
            >
              <span>+</span>
              <span>ADD</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
