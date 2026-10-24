import React from 'react';
import { MatrixRoomCategory } from '../../../../../packages/ui/src/pms/types';
import { formatCurrency } from '../../../../../packages/ui/src/index';

export interface PmsCategoryFilterProps {
  roomTypes: MatrixRoomCategory[];
  selectedCategoryId: string | 'ALL';
  onSelectCategory: (categoryId: string | 'ALL') => void;
}

export const PmsCategoryFilter: React.FC<PmsCategoryFilterProps> = ({
  roomTypes,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const totalRoomsCount = roomTypes.reduce((acc, rt) => acc + rt.rooms.length, 0);

  return (
    <div className="bg-slate-900/80 border-b border-slate-800 px-6 py-2.5 flex items-center space-x-2 overflow-x-auto no-scrollbar select-none">
      <button
        onClick={() => onSelectCategory('ALL')}
        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
          selectedCategoryId === 'ALL'
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
        }`}
      >
        <span>All Categories</span>
        <span className="bg-slate-800 text-[10px] px-1.5 py-0.5 rounded-md text-slate-300 font-extrabold">
          {totalRoomsCount}
        </span>
      </button>

      {roomTypes.map((rt) => {
        const isSelected = selectedCategoryId === rt.id;
        return (
          <button
            key={rt.id}
            onClick={() => onSelectCategory(rt.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-2 whitespace-nowrap ${
              isSelected
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <span>{rt.name}</span>
            <span className="text-[10px] text-amber-400/80 font-mono">
              ({formatCurrency(rt.basePrice)})
            </span>
            <span className="bg-slate-800 text-[10px] px-1.5 py-0.5 rounded-md text-slate-300 font-bold">
              {rt.rooms.length}
            </span>
          </button>
        );
      })}
    </div>
  );
};
