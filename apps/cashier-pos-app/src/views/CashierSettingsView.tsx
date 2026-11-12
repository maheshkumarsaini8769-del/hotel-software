import React from 'react';
import { Settings } from 'lucide-react';
import { UserPreferencesPanel } from '@spicehub/ui';
import { getApiClient } from '../lib/apiClient';

interface CashierSettingsViewProps {
  isDark?: boolean;
  onToast?: (msg: string) => void;
}

export const CashierSettingsView: React.FC<CashierSettingsViewProps> = ({ onToast }) => (
  <div className="mx-auto max-w-4xl space-y-4 pb-8">
    <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Settings className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">Cashier Settings</h2>
          <p className="text-sm text-amber-500">Personal preferences for this cashier account and terminal.</p>
        </div>
      </div>
    </header>
    <UserPreferencesPanel
      client={getApiClient()}
      includePrintSettings
      workstationProfile="cashier"
      onSaved={() => onToast?.('Settings saved')}
    />
  </div>
);
