import React, { useState } from 'react';
import { formatCurrency } from '../../../../packages/ui/src/index';

export interface InRoomDiningDish {
  id: string;
  name: string;
  category: string;
  price: number;
  prepTime: string;
  foodType: 'VEG' | 'NON_VEG' | 'BEVERAGE';
  image: string;
  description: string;
}

const IN_ROOM_DISHES: InRoomDiningDish[] = [
  {
    id: 'ird-1',
    name: 'Paneer Tikka Angara',
    category: 'Starters',
    price: 280,
    prepTime: '12m',
    foodType: 'VEG',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&auto=format&fit=crop&q=80',
    description: 'Charcoal grilled cottage cheese marinated in spiced hung yogurt, Kashmiri deghi mirch and kasoori methi.',
  },
  {
    id: 'ird-2',
    name: 'Murgh Malai Tikka',
    category: 'Starters',
    price: 340,
    prepTime: '14m',
    foodType: 'NON_VEG',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&auto=format&fit=crop&q=80',
    description: 'Velvety chicken chunks marinated in rich cream cheese, green cardamom and charcoal grilled.',
  },
  {
    id: 'ird-3',
    name: 'Dal Makhani Bukhara',
    category: 'Mains',
    price: 310,
    prepTime: '8m',
    foodType: 'VEG',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80',
    description: 'Slow-simmered black lentils overnight with fresh white butter, tomato puree and dairy cream.',
  },
  {
    id: 'ird-4',
    name: 'Butter Chicken Aslam Style',
    category: 'Mains',
    price: 420,
    prepTime: '12m',
    foodType: 'NON_VEG',
    image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&auto=format&fit=crop&q=80',
    description: 'Smoky roasted tandoori chicken cooked in velvety tomato makhani satin gravy with fenugreek butter.',
  },
  {
    id: 'ird-5',
    name: 'Butter Garlic Naan',
    category: 'Breads',
    price: 70,
    prepTime: '6m',
    foodType: 'VEG',
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&auto=format&fit=crop&q=80',
    description: 'Clay-oven baked leavened bread brushed with melted garlic butter and freshly chopped cilantro.',
  },
  {
    id: 'ird-6',
    name: 'Royal Kesar Pista Lassi',
    category: 'Beverages',
    price: 160,
    prepTime: '5m',
    foodType: 'BEVERAGE',
    image: 'https://images.unsplash.com/photo-1571006682893-4a12368a183d?w=400&auto=format&fit=crop&q=80',
    description: 'Traditional thick churned yogurt lassi infused with Kashmiri saffron strands and slivered pistachios.',
  },
];

export interface InRoomDiningViewProps {
  roomNumber?: string;
  onOrderPlaced?: (items: { dishId: string; name: string; quantity: number; price: number }[]) => void;
}

export const InRoomDiningView: React.FC<InRoomDiningViewProps> = ({
  roomNumber = '302',
  onOrderPlaced,
}) => {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orderToast, setOrderToast] = useState<string | null>(null);

  const handleUpdate = (dishId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[dishId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[dishId];
        return copy;
      }
      return { ...prev, [dishId]: next };
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalAmount = Object.entries(cart).reduce((sum, [id, qty]) => {
    const dish = IN_ROOM_DISHES.find((d) => d.id === id);
    return sum + (dish ? dish.price * qty : 0);
  }, 0);

  const handlePlaceInRoomOrder = () => {
    if (totalItems === 0) return;
    const items = Object.entries(cart).map(([id, qty]) => {
      const dish = IN_ROOM_DISHES.find((d) => d.id === id)!;
      return { dishId: id, name: dish.name, quantity: qty, price: dish.price };
    });

    if (onOrderPlaced) {
      onOrderPlaced(items);
    }

    setOrderToast(`🛎️ In-Room Order sent to Kitchen! Charged ₹${totalAmount} to Room ${roomNumber} Folio.`);
    setCart({});
    setTimeout(() => setOrderToast(null), 6000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 pb-28">
      {orderToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-bounce">
          <div className="p-4 bg-emerald-950 text-emerald-200 border border-emerald-600 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold flex items-center justify-between">
            <span>{orderToast}</span>
            <button onClick={() => setOrderToast(null)} className="text-white/60 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5 font-serif">
            <span>🍽️</span>
            <span>24/7 In-Room Culinary Service</span>
          </h2>
          <p className="text-xs text-amber-300/90 font-medium mt-0.5">
            Delivering directly to Room {roomNumber} • Charged to Room Folio
          </p>
        </div>
        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-black rounded-lg uppercase tracking-wider">
          Express 25m
        </span>
      </div>

      {/* Dishes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {IN_ROOM_DISHES.map((dish) => {
          const qty = cart[dish.id] || 0;
          return (
            <div
              key={dish.id}
              className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex gap-3 items-start justify-between shadow-md"
            >
              <div className="flex-1 min-h-[90px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-3.5 h-3.5 border flex items-center justify-center rounded-[3px] ${
                        dish.foodType === 'VEG'
                          ? 'border-emerald-500'
                          : dish.foodType === 'BEVERAGE'
                          ? 'border-cyan-500'
                          : 'border-rose-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          dish.foodType === 'VEG'
                            ? 'bg-emerald-500'
                            : dish.foodType === 'BEVERAGE'
                            ? 'bg-cyan-500'
                            : 'bg-rose-500'
                        }`}
                      />
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {dish.category}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-white leading-tight">
                    {dish.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-black text-xs sm:text-sm text-emerald-400">
                      {formatCurrency(dish.price)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">⏱️ {dish.prepTime}</span>
                  </div>
                </div>
              </div>

              {/* Right Image & Counter */}
              <div className="flex flex-col items-center w-24 shrink-0">
                <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/60 shadow-inner">
                  <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="w-full mt-2">
                  {qty > 0 ? (
                    <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/40 rounded-xl p-0.5">
                      <button
                        onClick={() => handleUpdate(dish.id, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 font-extrabold text-xs flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="font-black text-xs text-amber-300">{qty}</span>
                      <button
                        onClick={() => handleUpdate(dish.id, 1)}
                        className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      data-testid={`add-dish-${dish.id}`}
                      onClick={() => handleUpdate(dish.id, 1)}
                      className="w-full py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition"
                    >
                      + ADD
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Room Order Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto animate-bounce-once">
          <div
            data-testid="place-in-room-order-btn"
            onClick={handlePlaceInRoomOrder}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between cursor-pointer border border-amber-300"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 bg-slate-950 text-amber-400 rounded-full flex items-center justify-center font-black text-xs">
                {totalItems}
              </span>
              <div>
                <p className="text-[10px] font-extrabold text-slate-900/80 uppercase tracking-wider">
                  Deliver to Room {roomNumber}
                </p>
                <p className="font-black text-sm text-slate-950">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-slate-950 text-amber-400 font-black text-xs rounded-xl flex items-center gap-1">
              <span>Order to Room</span>
              <span>➔</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
