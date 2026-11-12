import React, { useCallback, useEffect, useState } from 'react';
import {
  SpiceHubClient,
  UserPreferences,
  UserPreferencesUpdate,
} from '@spicehub/api-client';

export interface UserPreferencesPanelProps {
  client: SpiceHubClient;
  includePrintSettings?: boolean;
  workstationProfile?: 'waiter' | 'cashier' | 'reception' | 'kds';
  visibleSections?: Array<'general' | 'appearance' | 'notifications' | 'print'>;
  includeSecuritySettings?: boolean;
  forceLight?: boolean;
  onSaved?: () => void;
}

const colorPresets = ['#2563EB', '#1D4ED8', '#0F172A', '#334155', '#64748B'];
type PreferenceSection = 'general' | 'appearance' | 'notifications' | 'print' | 'workstation';

const mergeDefaults = <T extends object>(defaults: T, values?: Partial<T>): T =>
  Object.assign({}, defaults, values);

function normalizePreferences(preferences: UserPreferences): UserPreferences {
  return {
    ...preferences,
    general: mergeDefaults<UserPreferences['general']>({
      language: 'en',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
    }, preferences.general),
    appearance: mergeDefaults<UserPreferences['appearance']>({
      theme: 'light',
      primaryColor: '#2563EB',
      fontSize: 'medium',
      sidebarCollapsed: false,
    }, preferences.appearance),
    notifications: mergeDefaults<UserPreferences['notifications']>({
      email: true,
      whatsapp: false,
      sms: false,
      soundAlerts: true,
      desktopPush: false,
    }, preferences.notifications),
    print: mergeDefaults<UserPreferences['print']>({
      thermalPrinterWidth: '80mm',
      printHeaderWithLogo: true,
      printKotSeparately: true,
      autoPrintAfterOrder: false,
      footerText: '',
    }, preferences.print),
    workstation: mergeDefaults<UserPreferences['workstation']>({
      shiftStartTime: '09:00',
      shiftEndTime: '18:00',
      showTaxBreakdown: true,
      checkInFlow: 'guided',
      soundVolume: 70,
      displayDensity: 'comfortable',
      stationName: '',
    }, preferences.workstation),
  };
}

function applyPreferences(preferences: UserPreferences, forceLight = true): void {
  const root = document.documentElement;
  if (forceLight) {
    root.classList.remove('dark');
    root.dataset.theme = 'light';
    root.style.colorScheme = 'light';
    const existing = document.getElementById('spicehub-preference-theme-overrides');
    if (existing) existing.remove();
    return;
  }
  const dark = preferences.appearance.theme === 'dark';

  root.classList.toggle('dark', dark);
  root.dataset.theme = preferences.appearance.theme;
  root.dataset.fontSize = preferences.appearance.fontSize;
  root.dataset.displayDensity = preferences.workstation.displayDensity;
  root.dataset.soundAlerts = String(preferences.notifications.soundAlerts);
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.style.fontSize = {
    small: '14px',
    medium: '16px',
    large: '18px',
  }[preferences.appearance.fontSize];
  root.style.setProperty('--spicehub-primary', preferences.appearance.primaryColor);
  root.style.setProperty('--spicehub-sound-volume', String(preferences.workstation.soundVolume / 100));

  if (!dark) {
    const existing = document.getElementById('spicehub-preference-theme-overrides');
    if (existing) existing.remove();
    return;
  }

  let themeOverrides = document.getElementById('spicehub-preference-theme-overrides') as HTMLStyleElement | null;
  if (!themeOverrides) {
    themeOverrides = document.createElement('style');
    themeOverrides.id = 'spicehub-preference-theme-overrides';
    document.head.append(themeOverrides);
  }
  themeOverrides.textContent = `
    .bg-blue-600 { background-color: var(--spicehub-primary) !important; }
    .hover\\:bg-blue-700:hover { background-color: var(--spicehub-primary) !important; }
    .text-blue-600 { color: var(--spicehub-primary) !important; }
    .border-blue-600 { border-color: var(--spicehub-primary) !important; }
    .ring-blue-600 { --tw-ring-color: var(--spicehub-primary) !important; }
    .dark body, .dark #root { background-color: #020617; color: #F8FAFC; }
    .dark .bg-white { background-color: #0F172A !important; }
    .dark .bg-slate-50 { background-color: #020617 !important; }
    .dark .text-slate-900 { color: #F8FAFC !important; }
    .dark .text-slate-800, .dark .text-slate-700 { color: #E2E8F0 !important; }
    .dark .text-slate-600, .dark .text-slate-500 { color: #CBD5E1 !important; }
    .dark .border-slate-200, .dark .border-slate-300 { border-color: #334155 !important; }
    [data-display-density="compact"] [data-testid^="ticket-card-"] { padding: 0.5rem !important; }
    [data-display-density="comfortable"] [data-testid^="ticket-card-"] { padding: 0.75rem !important; }
  `;
}

export const UserPreferencesPanel: React.FC<UserPreferencesPanelProps> = ({
  client,
  includePrintSettings = false,
  workstationProfile,
  visibleSections = ['general', 'appearance', 'notifications', ...(includePrintSettings ? ['print' as const] : [])],
  includeSecuritySettings = true,
  forceLight = true,
  onSaved,
}) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await client.userPreferences.get();
      setPreferences(normalizePreferences(response.data));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Preferences could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    if (preferences) applyPreferences(preferences, forceLight);
  }, [preferences, forceLight]);

  const update = <K extends PreferenceSection>(
    section: K,
    values: Partial<UserPreferences[K]>
  ) => {
    setPreferences((current) => current
      ? { ...current, [section]: { ...current[section], ...values } }
      : current);
    setSaveMessage('');
  };

  const savePreferences = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!preferences) return;

    const updatePayload: UserPreferencesUpdate = {
      general: preferences.general,
      appearance: preferences.appearance,
      notifications: preferences.notifications,
      ...(includePrintSettings ? { print: preferences.print } : {}),
      ...(workstationProfile ? { workstation: preferences.workstation } : {}),
    };

    setSaving(true);
    setError('');
    setSaveMessage('');
    try {
      const response = await client.userPreferences.update(updatePayload);
      setPreferences(normalizePreferences(response.data));
      setSaveMessage('Settings saved');
      onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Preferences could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const changePin = async () => {
    setPinError('');
    setPinMessage('');
    if (newPin !== confirmPin) {
      setPinError('The new PIN entries do not match.');
      return;
    }

    setPinSaving(true);
    try {
      const response = await client.auth.changeStaffPin({ currentPin, newPin });
      setPinMessage(response.message || 'PIN changed successfully.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (pinChangeError) {
      setPinError(pinChangeError instanceof Error ? pinChangeError.message : 'PIN could not be changed.');
    } finally {
      setPinSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-live="polite">
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        <p className="text-sm text-slate-500">Loading preferences…</p>
      </div>
    );
  }

  if (!preferences) {
    return (
      <section className="rounded-xl border border-red-200 bg-white p-5" aria-live="polite">
        <h3 className="font-semibold text-slate-900">Preferences unavailable</h3>
        <p className="mt-1 text-sm text-slate-600">{error || 'Preferences could not be loaded.'}</p>
        <button
          type="button"
          onClick={() => void loadPreferences()}
          className="mt-4 min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={savePreferences} className="mx-auto max-w-4xl space-y-4 bg-slate-50 pb-8">
      {error && (
        <p className="rounded-lg border border-red-200 bg-white p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {saveMessage && (
        <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700" aria-live="polite">
          {saveMessage}
        </p>
      )}

      {visibleSections.includes('general') && <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">General Settings</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Language
            <select
              name="language"
              value={preferences.general.language}
              onChange={(event) => update('general', { language: event.target.value as 'en' | 'hi' })}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Timezone
            <input
              name="timezone"
              autoComplete="off"
              value={preferences.general.timezone}
              onChange={(event) => update('general', { timezone: event.target.value })}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Date format
            <select
              name="dateFormat"
              value={preferences.general.dateFormat}
              onChange={(event) => update('general', { dateFormat: event.target.value as UserPreferences['general']['dateFormat'] })}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            </select>
          </label>
        </div>
      </section>}

      {visibleSections.includes('appearance') && <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Appearance Settings</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Theme
            <select
              name="theme"
              value={preferences.appearance.theme}
              onChange={(event) => update('appearance', { theme: event.target.value as UserPreferences['appearance']['theme'] })}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Font size
            <select
              name="fontSize"
              value={preferences.appearance.fontSize}
              onChange={(event) => update('appearance', { fontSize: event.target.value as UserPreferences['appearance']['fontSize'] })}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="sidebarCollapsed"
              checked={preferences.appearance.sidebarCollapsed}
              onChange={(event) => update('appearance', { sidebarCollapsed: event.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            />
            Collapse sidebar by default
          </label>
        </div>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-slate-700">Primary color</legend>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {colorPresets.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use primary color ${color}`}
                aria-pressed={preferences.appearance.primaryColor.toUpperCase() === color}
                onClick={() => update('appearance', { primaryColor: color })}
                className="h-9 w-9 rounded-lg border border-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                style={{ backgroundColor: color }}
              />
            ))}
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Custom
              <input
                type="color"
                name="primaryColor"
                value={preferences.appearance.primaryColor}
                onChange={(event) => update('appearance', { primaryColor: event.target.value })}
                className="h-10 w-12 rounded border border-slate-300 bg-white p-1"
              />
            </label>
          </div>
        </fieldset>
      </section>}

      {visibleSections.includes('notifications') && <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Notification Settings</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([
            ['email', 'Email notifications'],
            ['whatsapp', 'WhatsApp notifications'],
            ['sms', 'SMS notifications'],
            ['soundAlerts', 'Sound alerts for new orders'],
            ['desktopPush', 'Desktop push notifications'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                name={key}
                checked={preferences.notifications[key]}
                onChange={(event) => update('notifications', { [key]: event.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              />
              {label}
            </label>
          ))}
        </div>
      </section>}

      {includePrintSettings && visibleSections.includes('print') && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Print Settings</h3>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Thermal printer width
              <select
                name="thermalPrinterWidth"
                value={preferences.print.thermalPrinterWidth}
                onChange={(event) => update('print', { thermalPrinterWidth: event.target.value as UserPreferences['print']['thermalPrinterWidth'] })}
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <option value="58mm">58mm</option>
                <option value="80mm">80mm</option>
              </select>
            </label>
            {([
              ['printHeaderWithLogo', 'Print header with logo'],
              ['printKotSeparately', 'Print KOT separately'],
              ['autoPrintAfterOrder', 'Auto-print after order'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex min-h-11 items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name={key}
                  checked={preferences.print[key]}
                  onChange={(event) => update('print', { [key]: event.target.checked })}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                />
                {label}
              </label>
            ))}
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              Receipt footer
              <input
                type="text"
                maxLength={250}
                value={preferences.print.footerText}
                onChange={(event) => update('print', { footerText: event.target.value })}
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              />
            </label>
          </div>
        </section>
      )}

      {workstationProfile && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Workstation Settings</h3>
          <div className="mt-4 divide-y divide-slate-200">
            {workstationProfile !== 'kds' && (
              <>
                <label className="grid grid-cols-1 gap-2 py-3 text-sm text-slate-700 md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)] md:items-center">
                  <span>Shift start</span>
                  <input
                    type="time"
                    value={preferences.workstation.shiftStartTime}
                    onChange={(event) => update('workstation', { shiftStartTime: event.target.value })}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
                  />
                </label>
                <label className="grid grid-cols-1 gap-2 py-3 text-sm text-slate-700 md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)] md:items-center">
                  <span>Shift end</span>
                  <input
                    type="time"
                    value={preferences.workstation.shiftEndTime}
                    onChange={(event) => update('workstation', { shiftEndTime: event.target.value })}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
                  />
                </label>
              </>
            )}
            {workstationProfile === 'cashier' && (
              <label className="flex min-h-12 items-center justify-between gap-4 py-3 text-sm text-slate-700">
                <span>Show tax breakdown on bills</span>
                <input
                  type="checkbox"
                  checked={preferences.workstation.showTaxBreakdown}
                  onChange={(event) => update('workstation', { showTaxBreakdown: event.target.checked })}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600"
                />
              </label>
            )}
            {workstationProfile === 'reception' && (
              <label className="grid grid-cols-1 gap-2 py-3 text-sm text-slate-700 md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)] md:items-center">
                <span>Check-in flow</span>
                <select
                  value={preferences.workstation.checkInFlow}
                  onChange={(event) => update('workstation', { checkInFlow: event.target.value as 'guided' | 'quick' })}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
                >
                  <option value="guided">Guided</option>
                  <option value="quick">Quick</option>
                </select>
              </label>
            )}
            {workstationProfile === 'kds' && (
              <>
                <label className="grid grid-cols-1 gap-2 py-3 text-sm text-slate-700 md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)] md:items-center">
                  <span>Alert volume ({preferences.workstation.soundVolume}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={preferences.workstation.soundVolume}
                    onChange={(event) => update('workstation', { soundVolume: Number(event.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </label>
                <label className="grid grid-cols-1 gap-2 py-3 text-sm text-slate-700 md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)] md:items-center">
                  <span>Display density</span>
                  <select
                    value={preferences.workstation.displayDensity}
                    onChange={(event) => update('workstation', { displayDensity: event.target.value as 'comfortable' | 'compact' })}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </label>
                <label className="grid grid-cols-1 gap-2 py-3 text-sm text-slate-700 md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)] md:items-center">
                  <span>Station name</span>
                  <input
                    value={preferences.workstation.stationName}
                    onChange={(event) => update('workstation', { stationName: event.target.value })}
                    maxLength={80}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
                  />
                </label>
              </>
            )}
          </div>
        </section>
      )}

      {includeSecuritySettings && <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Security</h3>
        <p className="mt-1 text-sm text-slate-500">Verify your current PIN before setting a new one.</p>
        {pinError && <p className="mt-3 text-sm text-red-700" role="alert">{pinError}</p>}
        {pinMessage && <p className="mt-3 text-sm text-slate-700" aria-live="polite">{pinMessage}</p>}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-700">
            Current PIN
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              pattern="[0-9]{4,8}"
              value={currentPin}
              onChange={(event) => setCurrentPin(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-700">
            New PIN
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              pattern="[0-9]{4,8}"
              value={newPin}
              onChange={(event) => setNewPin(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-700">
            Confirm new PIN
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              pattern="[0-9]{4,8}"
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={pinSaving || !currentPin || !newPin || !confirmPin}
          onClick={() => void changePin()}
          className="mt-4 min-h-11 rounded-lg bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pinSaving ? 'Updating PIN…' : 'Change PIN'}
        </button>
      </section>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
};
