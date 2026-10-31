import React from 'react';
import { MatrixRoomCategory } from '@spicehub/ui';
import { formatCurrency } from '@spicehub/ui';

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
    <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center space-x-2 overflow-x-auto no-scrollbar select-none">
      <button
        onClick={() => onSelectCategory('ALL')}
        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap border ${
          selectedCategoryId === 'ALL'
            ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
            : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <span>All Categories</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
          selectedCategoryId === 'ALL' ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-600'
        }`}>
          {totalRoomsCount}
        </span>
      </button>

      {roomTypes.map((rt) => {
        const isSelected = selectedCategoryId === rt.id;
        return (
          <button
            key={rt.id}
            onClick={() => onSelectCategory(rt.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-2 whitespace-nowrap border ${
              isSelected
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>{rt.name}</span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({formatCurrency(rt.basePrice)})
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
              isSelected ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {rt.rooms.length}
            </span>
          </button>
        );
      })}
    </div>
  );
};
