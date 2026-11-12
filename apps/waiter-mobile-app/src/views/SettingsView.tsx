import React, { useMemo } from 'react';
import { Settings } from 'lucide-react';
import { SpiceHubClient } from '@spicehub/api-client';
import { UserPreferencesPanel } from '@spicehub/ui';
import { API_ORIGIN } from '../config/api';
import { getWaiterHotelId, getWaiterToken } from '../lib/waiterApi';

interface SettingsViewProps {
  isDark?: boolean;
  triggerToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ triggerToast }) => {
  const client = useMemo(() => {
    const apiClient = new SpiceHubClient({ baseUrl: API_ORIGIN });
    apiClient.setAuthToken(getWaiterToken() || null);
    apiClient.setHotelId(getWaiterHotelId() || null);
    return apiClient;
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5">
      <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Settings className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">Waiter Settings</h2>
            <p className="text-sm text-orange-500">Personal preferences for this waiter account and terminal.</p>
          </div>
        </div>
      </header>
      <UserPreferencesPanel
        client={client}
        workstationProfile="waiter"
        onSaved={() => triggerToast('Settings saved')}
      />
    </div>
  );
};
