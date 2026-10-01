import React from 'react';
import { GuestSessionModel } from '../../../../packages/ui/src/guest-portal/types';

export interface GuestPortalHeaderProps {
  session: GuestSessionModel | null;
  activeTab: 'HOME' | 'DINING' | 'ORDERS' | 'FOLIO';
  onTabChange: (tab: 'HOME' | 'DINING' | 'ORDERS' | 'FOLIO') => void;
  activeOrdersCount?: number;
}

export const GuestPortalHeader: React.FC<GuestPortalHeaderProps> = ({
  session,
  activeTab,
  onTabChange,
  activeOrdersCount = 0,
}) => {
  return (
    <header className="bg-slate-950 border-b border-slate-850 select-none">
      {/* Luxury Golden Greeting Hero */}
      <div className="max-w-4xl mx-auto px-5 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 text-2xl font-black shadow-lg shadow-amber-950/40">
            👑
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">
                5-Star Digital Concierge
              </span>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.2 rounded-full font-mono font-bold">
                Room {session?.roomNumber || '---'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mt-0.5">
              Welcome, {session?.guestName || 'Valued Guest'}
            </h1>
          </div>
        </div>

        {/* Room Status & Active Orders Indicator */}
        <div className="flex items-center space-x-3 text-xs">
          {activeOrdersCount > 0 && (
            <button
              onClick={() => onTabChange('ORDERS')}
              className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 animate-pulse shadow-sm"
            >
              <span>🍽️</span>
              <span>{activeOrdersCount} Order{activeOrdersCount > 1 ? 's' : ''} in Kitchen</span>
            </button>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-400 font-mono text-[11px]">
            {session?.expectedCheckOutDate
              ? `Depart: ${new Date(session.expectedCheckOutDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
              : 'In-House'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-4xl mx-auto px-4 flex items-center space-x-2 border-t border-slate-900">
        {[
          { key: 'HOME', label: 'Concierge', icon: '🛎️' },
          { key: 'DINING', label: 'In-Room Dining', icon: '🍷' },
          { key: 'ORDERS', label: 'Live Orders', icon: '⏱️', count: activeOrdersCount },
          { key: 'FOLIO', label: 'My Folio & Bill', icon: '🧾' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key as any)}
              className={`py-3 px-4 text-xs font-bold transition flex items-center space-x-2 border-b-2 relative ${
                isActive
                  ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
