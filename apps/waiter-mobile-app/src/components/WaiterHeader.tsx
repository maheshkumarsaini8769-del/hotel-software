import React from 'react';
import { ShiftStatus } from '@spicehub/shared-types';
import { WaiterProfileState } from '@spicehub/ui';

export interface WaiterHeaderProps {
  profile: WaiterProfileState;
  onToggleShift: (newStatus: ShiftStatus) => void;
}

export const WaiterHeader: React.FC<WaiterHeaderProps> = ({ profile, onToggleShift }) => {
  const isOnline = profile.shiftStatus === ShiftStatus.ON_DUTY;
  const isBusy = profile.shiftStatus === ShiftStatus.BUSY;

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 py-3 text-white flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center font-bold text-sm shadow">
            {profile.name.substring(0, 2).toUpperCase()}
          </div>
          <span
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
              isOnline ? 'bg-emerald-500 animate-pulse' : isBusy ? 'bg-amber-500' : 'bg-slate-500'
            }`}
          />
        </div>
        <div>
          <h1 className="font-semibold text-sm leading-tight">{profile.name}</h1>
          <p className="text-[11px] text-slate-400">
            {isOnline ? '🟢 On Duty' : isBusy ? '🟡 Busy' : '⚪ Offline'}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Active Requests Pill */}
        {profile.activeRequestsCount > 0 && (
          <span className="px-2.5 py-1 text-xs font-bold bg-rose-500 text-white rounded-full animate-bounce">
            🔔 {profile.activeRequestsCount}
          </span>
        )}

        {/* Shift Status Selector */}
        <select
          value={profile.shiftStatus}
          onChange={(e) => onToggleShift(e.target.value as ShiftStatus)}
          className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
        >
          <option value={ShiftStatus.ON_DUTY}>On Duty</option>
          <option value={ShiftStatus.BUSY}>Busy</option>
          <option value={ShiftStatus.OFFLINE}>Offline</option>
        </select>
      </div>
    </header>
  );
};
