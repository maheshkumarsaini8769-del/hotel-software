import React from 'react';
import { KitchenStationModel } from '@spicehub/ui';

export interface KdsStationTabsProps {
  stations: KitchenStationModel[];
  selectedStationId: string | 'ALL';
  onSelectStation: (stationId: string | 'ALL') => void;
  getStationCount?: (stationId: string | 'ALL') => number;
}

export const KdsStationTabs: React.FC<KdsStationTabsProps> = ({
  stations,
  selectedStationId,
  onSelectStation,
  getStationCount,
}) => {
  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-2 flex items-center space-x-2 overflow-x-auto no-scrollbar">
      {/* ALL Stations Tab */}
      <button
        onClick={() => onSelectStation('ALL')}
        className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
          selectedStationId === 'ALL'
            ? 'bg-primary-600 text-white shadow-md shadow-primary-950/40 ring-1 ring-primary-400'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
        }`}
      >
        <span>All Stations</span>
        {getStationCount && (
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              selectedStationId === 'ALL' ? 'bg-primary-900 text-primary-100' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {getStationCount('ALL')}
          </span>
        )}
      </button>

      {/* Individual Station Tabs */}
      {stations.map((st) => {
        const isSelected = selectedStationId === st.id;
        const count = getStationCount ? getStationCount(st.id) : 0;

        return (
          <button
            key={st.id}
            onClick={() => onSelectStation(st.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
              isSelected
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40 ring-1 ring-amber-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
            }`}
          >
            <span className="flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full ${st.isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`}
                title={st.isOnline ? 'Station Online' : 'Station Offline'}
              />
              <span>{st.stationName}</span>
            </span>
            {getStationCount && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isSelected ? 'bg-amber-900 text-amber-100' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
